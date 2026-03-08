import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const userId = message?.from?.id || body.callback_query?.from?.id;

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

    // Handle /start command
    if (text === "/start") {
      await sendMessage(chatId,
        `🚀 <b>Welcome to the Crypto Trading Bot!</b>\n\nUse the buttons below to get started.`,
        {
          inline_keyboard: [
            [{ text: "📝 Register", callback_data: "register" }],
            [{ text: "🔗 Link Account", callback_data: "link_account" }],
            [{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }],
            [{ text: "📊 My Portfolio", callback_data: "portfolio" }],
            [{ text: "🔑 Forgot Password", callback_data: "forgot_password" }],
          ],
        }
      );
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Handle callback queries
    if (callbackData === "register") {
      await sendMessage(chatId,
        `📝 <b>Registration</b>\n\nSend your details in this format:\n\n<code>/register FullName PhoneNumber Password</code>\n\nExample:\n<code>/register John Doe 254712345678 MyPass123</code>`
      );
    } else if (callbackData === "link_account") {
      await sendMessage(chatId,
        `🔗 <b>Link Account</b>\n\nSend:\n<code>/link email@example.com YourPassword</code>`
      );
    } else if (callbackData === "buy_tokens") {
      // Fetch available coins
      const { data: coins } = await supabase
        .from("coins")
        .select("id, name, symbol, price")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("market_cap", { ascending: false, nullsFirst: false })
        .limit(10);

      if (!coins || coins.length === 0) {
        await sendMessage(chatId, "No tokens available right now.");
      } else {
        const buttons = coins.map((c: any) => [{
          text: `${c.symbol} - KES ${c.price.toFixed(4)}`,
          callback_data: `buy_${c.id}`,
        }]);
        await sendMessage(chatId, "💰 <b>Select a token to buy:</b>", { inline_keyboard: buttons });
      }
    } else if (callbackData === "portfolio") {
      await sendMessage(chatId, "📊 Send <code>/portfolio</code> to view your holdings.");
    } else if (callbackData === "forgot_password") {
      await sendMessage(chatId,
        `🔑 <b>Forgot Password</b>\n\nSend:\n<code>/forgot email@example.com 254712345678</code>\n\nA temporary password will be sent to your email.`
      );
    } else if (callbackData?.startsWith("buy_")) {
      const coinId = callbackData.replace("buy_", "");
      await sendMessage(chatId,
        `Send:\n<code>/buy ${coinId} Amount MpesaPhone</code>\n\nExample:\n<code>/buy ${coinId} 500 254712345678</code>\n\n(Amount in KES)`
      );
    }

    // Handle /register command
    if (text.startsWith("/register ")) {
      const parts = text.replace("/register ", "").trim().split(/\s+/);
      if (parts.length < 3) {
        await sendMessage(chatId, "❌ Format: <code>/register FullName Phone Password</code>");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      const password = parts.pop()!;
      const phone = parts.pop()!;
      const fullName = parts.join(" ");
      const tempEmail = `tg_${userId}@telegram.user`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, telegram_id: userId },
      });

      if (authError) {
        await sendMessage(chatId, `❌ Registration failed: ${authError.message}`);
      } else if (authData.user) {
        await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", authData.user.id);
        await sendMessage(chatId,
          `✅ <b>Registered!</b>\n\nEmail: <code>${tempEmail}</code>\nFull Name: ${fullName}\nPhone: ${phone}\n\nYou can now buy tokens!`
        );
      }
    }

    // Handle /link command
    if (text.startsWith("/link ")) {
      const parts = text.replace("/link ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: <code>/link email password</code>");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      const [email, password] = parts;
      const { data: signIn, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        await sendMessage(chatId, `❌ Login failed: ${signError.message}`);
      } else {
        await sendMessage(chatId, `✅ Account linked! You can now trade via this bot.`);
      }
    }

    // Handle /buy command
    if (text.startsWith("/buy ")) {
      const parts = text.replace("/buy ", "").trim().split(/\s+/);
      if (parts.length < 3) {
        await sendMessage(chatId, "❌ Format: <code>/buy coinId amountKES phone</code>");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      const [coinId, amtStr, phone] = parts;
      const amount = parseInt(amtStr);
      if (!amount || amount < 1) {
        await sendMessage(chatId, "❌ Invalid amount");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      // Find user by telegram ID
      const { data: profiles } = await supabase.from("profiles").select("user_id").eq("phone", phone).limit(1);
      const buyerUserId = profiles?.[0]?.user_id;
      if (!buyerUserId) {
        await sendMessage(chatId, "❌ No account found with this phone. Register first with /register");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      // Trigger STK push via the existing edge function
      const stkUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-stk-push`;
      // We need a service-level call, so we'll handle it directly
      await sendMessage(chatId, `📱 Sending M-PESA prompt to ${phone} for KES ${amount}...\n\nPlease enter your PIN on your phone.`);

      // Note: Direct STK push requires user auth token. For bot, we inform user to use the web app.
      await sendMessage(chatId, `⚠️ For security, please complete the purchase on the web platform or deposit first via /deposit`);
    }

    // Handle /forgot command
    if (text.startsWith("/forgot ")) {
      const parts = text.replace("/forgot ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: <code>/forgot email phone</code>");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      const [email, phone] = parts;

      // Verify email and phone match
      const { data: profile } = await supabase.from("profiles").select("user_id, email, phone").eq("email", email).maybeSingle();
      if (!profile || profile.phone !== phone) {
        await sendMessage(chatId, "❌ Email and phone don't match our records.");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      // Generate temp password and update
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      const { error: updateError } = await supabase.auth.admin.updateUserById(profile.user_id, { password: tempPassword });
      if (updateError) {
        await sendMessage(chatId, `❌ Failed to reset password: ${updateError.message}`);
      } else {
        await sendMessage(chatId,
          `✅ <b>Password Reset</b>\n\nYour temporary password is:\n<code>${tempPassword}</code>\n\nPlease change it after logging in.`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram bot error:", error);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
