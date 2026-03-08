import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: botConfig } = await supabase
      .from("telegram_config")
      .select("*")
      .maybeSingle();

    if (!botConfig?.is_active || !botConfig?.bot_token) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const message = body.message || body.callback_query?.message;
    const callbackData = body.callback_query?.data;
    const chatId = message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = message?.text || "";
    const telegramUserId = String(message?.from?.id || body.callback_query?.from?.id || "");

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const sendMessage = async (chat: number, msg: string, replyMarkup?: any) => {
      await fetch(`https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: msg,
          parse_mode: "HTML",
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });
    };

    // Helper: find linked user by telegram_id stored in profiles
    const findLinkedUser = async (tgId: string) => {
      // Check profiles that have telegram_id in metadata or were registered via bot
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email")
        .or(`phone.eq.tg_${tgId}`)
        .limit(1);

      if (data && data.length > 0) return data[0];

      // Also check by telegram chat mapping
      const { data: mapping } = await supabase
        .from("telegram_users")
        .select("user_id")
        .eq("telegram_id", tgId)
        .maybeSingle();

      if (mapping?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email")
          .eq("user_id", mapping.user_id)
          .maybeSingle();
        return profile;
      }
      return null;
    };

    const saveTelegramLink = async (tgId: string, userId: string) => {
      await supabase.from("telegram_users").upsert(
        { telegram_id: tgId, user_id: userId, chat_id: String(chatId) },
        { onConflict: "telegram_id" }
      );
    };

    // ── /start ──
    if (text === "/start" || callbackData === "main_menu") {
      const linked = await findLinkedUser(telegramUserId);
      const greeting = linked?.full_name ? `Hi ${linked.full_name}! ` : "";
      await sendMessage(chatId,
        `🚀 <b>${greeting}Welcome to Sarafu Bot!</b>\n\nWhat would you like to do?`,
        {
          inline_keyboard: [
            ...(linked
              ? [
                  [{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }],
                  [{ text: "📊 My Portfolio", callback_data: "portfolio" }],
                  [{ text: "🔑 Reset Password", callback_data: "forgot_password" }],
                ]
              : [
                  [{ text: "📝 Create Account", callback_data: "register" }],
                  [{ text: "🔗 Link Existing Account", callback_data: "link_account" }],
                ]),
          ],
        }
      );
      return ok();
    }

    // ── Register flow ──
    if (callbackData === "register") {
      await sendMessage(chatId,
        `📝 <b>Create Account</b>\n\nSend your details:\n\n<code>/register YourName 254712345678 YourPassword</code>\n\nExample:\n<code>/register John 254712345678 MyPass123</code>`
      );
      return ok();
    }

    if (text.startsWith("/register ")) {
      const parts = text.replace("/register ", "").trim().split(/\s+/);
      if (parts.length < 3) {
        await sendMessage(chatId, "❌ Format: /register Name Phone Password");
        return ok();
      }
      const password = parts.pop()!;
      const phone = parts.pop()!;
      const fullName = parts.join(" ");
      const tempEmail = `tg_${telegramUserId}@telegram.user`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, telegram_id: telegramUserId },
      });

      if (authError) {
        await sendMessage(chatId, `❌ ${authError.message}`);
      } else if (authData.user) {
        await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", authData.user.id);
        await saveTelegramLink(telegramUserId, authData.user.id);
        await sendMessage(chatId,
          `✅ <b>Account Created!</b>\n\nName: ${fullName}\nPhone: ${phone}\n\nYou can now buy tokens!`,
          { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
      return ok();
    }

    // ── Link account flow ──
    if (callbackData === "link_account") {
      await sendMessage(chatId,
        `🔗 <b>Link Account</b>\n\nSend your login details:\n\n<code>/link your@email.com YourPassword</code>`
      );
      return ok();
    }

    if (text.startsWith("/link ")) {
      const parts = text.replace("/link ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: /link email password");
        return ok();
      }
      const [email, password] = parts;
      const { data: signIn, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError || !signIn.user) {
        await sendMessage(chatId, `❌ Login failed: ${signError?.message || "Unknown error"}`);
      } else {
        await saveTelegramLink(telegramUserId, signIn.user.id);
        await sendMessage(chatId,
          `✅ <b>Account linked!</b>\n\nYou can now trade via this bot.`,
          { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
      return ok();
    }

    // ── Buy tokens: show coin list with friendly buttons ──
    if (callbackData === "buy_tokens") {
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link or create an account first.",
          { inline_keyboard: [[{ text: "📝 Create Account", callback_data: "register" }], [{ text: "🔗 Link Account", callback_data: "link_account" }]] }
        );
        return ok();
      }

      const { data: coins } = await supabase
        .from("coins")
        .select("id, name, symbol, price")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("market_cap", { ascending: false, nullsFirst: false })
        .limit(10);

      if (!coins || coins.length === 0) {
        await sendMessage(chatId, "No tokens available right now.",
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else {
        const buttons = coins.map((c: any) => [{
          text: `${c.name} (${c.symbol}) - KES ${Number(c.price).toFixed(4)}`,
          callback_data: `select_${c.id}`,
        }]);
        buttons.push([{ text: "🏠 Main Menu", callback_data: "main_menu" }]);
        await sendMessage(chatId, "💰 <b>Select a token to buy:</b>", { inline_keyboard: buttons });
      }
      return ok();
    }

    // ── Token selected: ask for amount ──
    if (callbackData?.startsWith("select_")) {
      const coinId = callbackData.replace("select_", "");
      const { data: coin } = await supabase.from("coins").select("name, symbol, price").eq("id", coinId).maybeSingle();
      if (!coin) {
        await sendMessage(chatId, "❌ Token not found.");
        return ok();
      }
      await sendMessage(chatId,
        `💰 <b>${coin.name} (${coin.symbol})</b>\nPrice: KES ${Number(coin.price).toFixed(4)}\n\nHow much KES do you want to spend?\n\nChoose an amount:`,
        {
          inline_keyboard: [
            [
              { text: "KES 100", callback_data: `amt_${coinId}_100` },
              { text: "KES 500", callback_data: `amt_${coinId}_500` },
            ],
            [
              { text: "KES 1000", callback_data: `amt_${coinId}_1000` },
              { text: "KES 5000", callback_data: `amt_${coinId}_5000` },
            ],
            [{ text: "✏️ Custom Amount", callback_data: `custom_${coinId}` }],
            [{ text: "⬅️ Back", callback_data: "buy_tokens" }],
          ],
        }
      );
      return ok();
    }

    // ── Custom amount: ask user to type ──
    if (callbackData?.startsWith("custom_")) {
      const coinId = callbackData.replace("custom_", "");
      await sendMessage(chatId,
        `✏️ Send the amount in KES:\n\n<code>/amount ${coinId} 500</code>\n\n(Replace 500 with your amount)`
      );
      return ok();
    }

    // ── Handle /amount command for custom amounts ──
    if (text.startsWith("/amount ")) {
      const parts = text.replace("/amount ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: /amount coinId amount");
        return ok();
      }
      const [coinId, amtStr] = parts;
      const amount = parseInt(amtStr);
      if (!amount || amount < 1) {
        await sendMessage(chatId, "❌ Invalid amount.");
        return ok();
      }
      // Ask for phone
      await askForPhone(chatId, coinId, amount);
      return ok();
    }

    // ── Preset amount selected: ask for phone ──
    if (callbackData?.startsWith("amt_")) {
      const parts = callbackData.replace("amt_", "").split("_");
      const coinId = parts[0];
      const amount = parseInt(parts[1]);
      await askForPhone(chatId, coinId, amount);
      return ok();
    }

    async function askForPhone(chat: number, coinId: string, amount: number) {
      const linked = await findLinkedUser(telegramUserId);
      const phone = linked?.phone;
      
      if (phone && phone !== `tg_${telegramUserId}`) {
        // Use saved phone
        await sendMessage(chat,
          `📱 <b>Confirm Purchase</b>\n\nAmount: KES ${amount}\nM-PESA Number: ${phone}\n\nConfirm payment?`,
          {
            inline_keyboard: [
              [{ text: "✅ Confirm & Pay", callback_data: `pay_${coinId}_${amount}_${phone}` }],
              [{ text: "📱 Use Different Number", callback_data: `phone_${coinId}_${amount}` }],
              [{ text: "❌ Cancel", callback_data: "buy_tokens" }],
            ],
          }
        );
      } else {
        await sendMessage(chat,
          `📱 Send your M-PESA number:\n\n<code>/pay ${coinId} ${amount} 254712345678</code>\n\n(Use format 254...)`
        );
      }
    }

    // ── Phone entry for different number ──
    if (callbackData?.startsWith("phone_")) {
      const parts = callbackData.replace("phone_", "").split("_");
      const coinId = parts[0];
      const amount = parts[1];
      await sendMessage(chatId,
        `📱 Send your M-PESA number:\n\n<code>/pay ${coinId} ${amount} 254712345678</code>`
      );
      return ok();
    }

    // ── Confirm pay via button ──
    if (callbackData?.startsWith("pay_")) {
      const parts = callbackData.replace("pay_", "").split("_");
      const coinId = parts[0];
      const amount = parseInt(parts[1]);
      const phone = parts[2];
      await processPurchase(chatId, telegramUserId, coinId, amount, phone);
      return ok();
    }

    // ── /pay command ──
    if (text.startsWith("/pay ")) {
      const parts = text.replace("/pay ", "").trim().split(/\s+/);
      if (parts.length < 3) {
        await sendMessage(chatId, "❌ Format: /pay coinId amount phone");
        return ok();
      }
      const [coinId, amtStr, phone] = parts;
      const amount = parseInt(amtStr);
      if (!amount || amount < 1) {
        await sendMessage(chatId, "❌ Invalid amount.");
        return ok();
      }
      await processPurchase(chatId, telegramUserId, coinId, amount, phone);
      return ok();
    }

    async function processPurchase(chat: number, tgId: string, coinId: string, amount: number, phone: string) {
      const linked = await findLinkedUser(tgId);
      if (!linked) {
        await sendMessage(chat, "❌ No linked account. Please link or register first.",
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
        return;
      }

      const { data: coin } = await supabase.from("coins").select("name, symbol, price").eq("id", coinId).maybeSingle();
      if (!coin) {
        await sendMessage(chat, "❌ Token not found.");
        return;
      }

      const tokenAmount = amount / Number(coin.price);

      await sendMessage(chat,
        `📱 <b>Sending M-PESA prompt...</b>\n\nToken: ${coin.name} (${coin.symbol})\nAmount: KES ${amount}\nYou'll get: ~${tokenAmount.toFixed(2)} ${coin.symbol}\nPhone: ${phone}\n\nPlease enter your M-PESA PIN when prompted.`
      );

      // Call STK push
      try {
        const stkResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-stk-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            phone,
            amount,
            coinId,
            userId: linked.user_id,
            type: "deposit",
          }),
        });

        const stkData = await stkResp.json();

        if (stkData.error || !stkData.checkoutRequestId) {
          await sendMessage(chat, `❌ Payment failed: ${stkData.error || "Could not initiate payment"}`,
            { inline_keyboard: [[{ text: "🔄 Try Again", callback_data: `select_${coinId}` }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        } else {
          await sendMessage(chat,
            `✅ <b>STK Push sent!</b>\n\nCheck your phone and enter your M-PESA PIN.\n\nYour tokens will be allocated automatically after payment confirms.`,
            { inline_keyboard: [[{ text: "💰 Buy More", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        }
      } catch (err) {
        console.error("STK push error:", err);
        await sendMessage(chat, `❌ Payment service error. Please try again later.`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
    }

    // ── Portfolio ──
    if (callbackData === "portfolio") {
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link your account first.",
          { inline_keyboard: [[{ text: "🔗 Link Account", callback_data: "link_account" }]] }
        );
        return ok();
      }

      const { data: holdings } = await supabase
        .from("holdings")
        .select("amount, average_buy_price, coin_id, coins(name, symbol, price)")
        .eq("user_id", linked.user_id)
        .gt("amount", 0);

      if (!holdings || holdings.length === 0) {
        await sendMessage(chatId, "📊 You don't have any tokens yet.",
          { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else {
        let msg = "📊 <b>Your Portfolio</b>\n\n";
        for (const h of holdings) {
          const coin = (h as any).coins;
          if (!coin) continue;
          const value = Number(h.amount) * Number(coin.price);
          msg += `• <b>${coin.name}</b> (${coin.symbol})\n  ${Number(h.amount).toFixed(2)} tokens ≈ KES ${value.toFixed(2)}\n\n`;
        }
        await sendMessage(chatId, msg,
          { inline_keyboard: [[{ text: "💰 Buy More", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
      return ok();
    }

    // ── Forgot password ──
    if (callbackData === "forgot_password") {
      await sendMessage(chatId,
        `🔑 <b>Reset Password</b>\n\nSend your email and phone:\n\n<code>/forgot your@email.com 254712345678</code>`
      );
      return ok();
    }

    if (text.startsWith("/forgot ")) {
      const parts = text.replace("/forgot ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: /forgot email phone");
        return ok();
      }
      const [email, phone] = parts;
      const { data: profile } = await supabase.from("profiles").select("user_id, email, phone").eq("email", email).maybeSingle();
      if (!profile || profile.phone !== phone) {
        await sendMessage(chatId, "❌ Email and phone don't match our records.");
        return ok();
      }
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      const { error: updateError } = await supabase.auth.admin.updateUserById(profile.user_id, { password: tempPassword });
      if (updateError) {
        await sendMessage(chatId, `❌ Failed: ${updateError.message}`);
      } else {
        await sendMessage(chatId,
          `✅ <b>Password Reset</b>\n\nTemporary password:\n<code>${tempPassword}</code>\n\nPlease change it after logging in.`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
      return ok();
    }

    return ok();
  } catch (error) {
    console.error("Telegram bot error:", error);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
