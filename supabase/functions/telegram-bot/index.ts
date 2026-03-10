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
      return ok();
    }

    const body = await req.json();
    const message = body.message || body.callback_query?.message;
    const callbackData = body.callback_query?.data;
    const chatId = message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = message?.text || "";
    const telegramUserId = String(body.callback_query?.from?.id || body.message?.from?.id || "");
    const callbackQueryId = body.callback_query?.id;

    if (!chatId) return ok();

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

    const answerCallback = async () => {
      if (callbackQueryId) {
        await fetch(`https://api.telegram.org/bot${botConfig.bot_token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callbackQueryId }),
        });
      }
    };

    // ── Find linked user ──
    const findLinkedUser = async (tgId: string) => {
      const { data: mapping } = await supabase
        .from("telegram_users")
        .select("user_id, chat_id")
        .eq("telegram_id", tgId)
        .maybeSingle();

      if (mapping?.user_id) {
        if (mapping.chat_id !== String(chatId)) {
          await supabase.from("telegram_users")
            .update({ chat_id: String(chatId) })
            .eq("telegram_id", tgId);
        }
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

    const linkedMenu = {
      inline_keyboard: [
        [{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }, { text: "📊 Portfolio", callback_data: "portfolio" }],
        [{ text: "💳 Deposit", callback_data: "deposit" }, { text: "🔑 Reset Password", callback_data: "forgot_password" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
      ],
    };

    const unlinkedMenu = {
      inline_keyboard: [
        [{ text: "📝 Create Account", callback_data: "register" }],
        [{ text: "🔗 Link Existing Account", callback_data: "link_account" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
      ],
    };

    // ── Helpers ──
    const saveLastCoin = async (tgId: string, coinId: string) => {
      await supabase.from("telegram_users").update({ last_selected_coin_id: coinId }).eq("telegram_id", tgId);
    };
    const getLastCoin = async (tgId: string) => {
      const { data } = await supabase.from("telegram_users").select("last_selected_coin_id").eq("telegram_id", tgId).maybeSingle();
      return data?.last_selected_coin_id;
    };
    const savePendingAmount = async (tgId: string, amount: number | null) => {
      await supabase.from("telegram_users").update({ pending_amount: amount }).eq("telegram_id", tgId);
    };
    const getPendingAmount = async (tgId: string) => {
      const { data } = await supabase.from("telegram_users").select("pending_amount").eq("telegram_id", tgId).maybeSingle();
      return data?.pending_amount;
    };
    const getMinBuyAmount = async () => {
      const { data } = await supabase.from("site_settings").select("min_buy_amount").maybeSingle();
      return data?.min_buy_amount || 500;
    };

    const normalizePhone = (p: string): string => {
      let phone = p.trim().replace(/\s+/g, "").replace(/^\+/, "");
      if (phone.startsWith("07") || phone.startsWith("01")) {
        phone = "254" + phone.substring(1);
      }
      return phone;
    };

    const isPhoneNumber = (t: string): boolean => {
      const p = t.trim().replace(/\s+/g, "").replace(/^\+/, "");
      return /^254\d{9}$/.test(p) || /^07\d{8}$/.test(p) || /^01\d{8}$/.test(p);
    };

    // ── Process purchase (sends STK push) ──
    async function processPurchase(chat: number, tgId: string, coinId: string, amount: number, phone: string) {
      const linked = await findLinkedUser(tgId);
      if (!linked) {
        await sendMessage(chat, "❌ No linked account.", unlinkedMenu);
        return;
      }

      const { data: coin } = await supabase.from("coins").select("name, symbol, price").eq("id", coinId).maybeSingle();
      if (!coin) {
        await sendMessage(chat, "❌ Token not found.");
        return;
      }

      phone = normalizePhone(phone);
      const tokenAmount = (amount / Number(coin.price)).toFixed(2);

      // Clear pending state
      await savePendingAmount(tgId, null);

      await sendMessage(chat,
        `⏳ <b>Processing payment...</b>\n\n` +
        `Token: ${coin.name} (${coin.symbol})\n` +
        `Amount: KES ${amount.toLocaleString()}\n` +
        `You'll get: ~${tokenAmount} ${coin.symbol}\n` +
        `M-PESA: ${phone}\n\n` +
        `📱 Check your phone for the M-PESA prompt and enter your PIN.`
      );

      try {
        const stkUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-stk-push`;
        const stkBody = {
          phone,
          amount,
          userId: linked.user_id,
          type: "deposit",
        };
        console.log("Calling STK push:", stkUrl, JSON.stringify(stkBody));
        
        const stkResp = await fetch(stkUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(stkBody),
        });

        const respText = await stkResp.text();
        console.log("STK push response status:", stkResp.status, "body:", respText);
        
        let stkData: any;
        try { stkData = JSON.parse(respText); } catch { stkData = { error: respText }; }

        if (stkData.error || !stkData.checkoutRequestId) {
          await sendMessage(chat,
            `❌ <b>Payment failed</b>\n\n${stkData.error || "Could not initiate payment"}`,
            { inline_keyboard: [[{ text: "🔄 Try Again", callback_data: `sel_${coinId}` }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        } else {
          await sendMessage(chat,
            `✅ <b>STK Push sent!</b>\n\nEnter your M-PESA PIN on your phone.\nTokens will be allocated automatically after payment confirms.`,
            { inline_keyboard: [[{ text: "💰 Buy More", callback_data: "buy_tokens" }], [{ text: "📊 Portfolio", callback_data: "portfolio" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        }
      } catch (err) {
        console.error("STK push error:", err);
        await sendMessage(chat, `❌ Payment service error. Please try again.`,
          { inline_keyboard: [[{ text: "🔄 Retry", callback_data: `sel_${coinId}` }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
    }

    // ── Process deposit ──
    async function processDeposit(chat: number, tgId: string, amount: number, phone: string) {
      const linked = await findLinkedUser(tgId);
      if (!linked) {
        await sendMessage(chat, "❌ No linked account.", unlinkedMenu);
        return;
      }

      phone = normalizePhone(phone);
      await savePendingAmount(tgId, null);

      await sendMessage(chat, `⏳ <b>Sending M-PESA prompt for KES ${amount.toLocaleString()}...</b>\n\n📱 Enter your PIN when prompted.`);

      try {
        const stkUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-stk-push`;
        const stkBody = {
          phone,
          amount,
          userId: linked.user_id,
          type: "deposit",
        };
        console.log("Deposit STK push:", stkUrl, JSON.stringify(stkBody));
        
        const stkResp = await fetch(stkUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(stkBody),
        });

        const respText = await stkResp.text();
        console.log("Deposit STK response:", stkResp.status, respText);
        
        let stkData: any;
        try { stkData = JSON.parse(respText); } catch { stkData = { error: respText }; }
        if (stkData.error) {
          await sendMessage(chat, `❌ ${stkData.error}`,
            { inline_keyboard: [[{ text: "🔄 Retry", callback_data: "deposit" }], [{ text: "🏠 Menu", callback_data: "main_menu" }]] }
          );
        } else {
          await sendMessage(chat,
            `✅ <b>STK Push sent!</b>\n\nEnter your M-PESA PIN. Your wallet will be credited automatically.`,
            { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        }
      } catch (err) {
        console.error("Deposit STK error:", err);
        await sendMessage(chat, `❌ Payment service error.`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
    }

    // ── Confirm purchase: show phone and confirm button ──
    async function confirmPurchase(chat: number, tgId: string, coinId: string, amount: number) {
      const linked = await findLinkedUser(tgId);
      if (!linked) {
        await sendMessage(chat, "❌ Please link your account first.", unlinkedMenu);
        return;
      }

      const { data: coin } = await supabase.from("coins").select("name, symbol, price").eq("id", coinId).maybeSingle();
      if (!coin) {
        await sendMessage(chat, "❌ Token not found.");
        return;
      }

      const tokenAmount = (amount / Number(coin.price)).toFixed(2);

      // Save pending state so phone input can pick it up
      await saveLastCoin(tgId, coinId);
      await savePendingAmount(tgId, amount);

      // Always ask for M-PESA number — user can send any number
      const phone = linked.phone;
      if (phone && !phone.startsWith("tg_") && /^254\d{9}$/.test(phone)) {
        await sendMessage(chat,
          `🛒 <b>Confirm Purchase</b>\n\n` +
          `Token: <b>${coin.name} (${coin.symbol})</b>\n` +
          `Amount: <b>KES ${amount.toLocaleString()}</b>\n` +
          `You'll get: ~<b>${tokenAmount} ${coin.symbol}</b>\n\n` +
          `Which M-PESA number to use?`,
          {
            inline_keyboard: [
              [{ text: `✅ Use ${phone}`, callback_data: `pay_${coinId}_${amount}_${phone}` }],
              [{ text: "📱 Enter Different Number", callback_data: `phn_${coinId}_${amount}` }],
              [{ text: "❌ Cancel", callback_data: "buy_tokens" }],
            ],
          }
        );
      } else {
        await sendMessage(chat,
          `📱 <b>Enter M-PESA Number</b>\n\n` +
          `To buy <b>${tokenAmount} ${coin.symbol}</b> for KES ${amount.toLocaleString()}:\n\n` +
          `Type your M-PESA number, e.g.:\n<code>0712345678</code> or <code>254712345678</code>`,
          { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "buy_tokens" }]] }
        );
      }
    }

    // ══════════════════════════════════════════════
    // ══  COMMAND & CALLBACK HANDLERS            ══
    // ══════════════════════════════════════════════

    // ── /start or main_menu ──
    if (text === "/start" || callbackData === "main_menu") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      // Clear any pending state
      await savePendingAmount(telegramUserId, null);

      if (linked) {
        await sendMessage(chatId,
          `🚀 <b>Welcome back, ${linked.full_name || "there"}!</b>\n\nWhat would you like to do?`,
          linkedMenu
        );
      } else {
        await sendMessage(chatId,
          `🚀 <b>Welcome to Sarafu Bot!</b>\n\nCreate or link your account to start trading.`,
          unlinkedMenu
        );
      }
      return ok();
    }

    // ── Help ──
    if (callbackData === "help" || text === "/help") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      await sendMessage(chatId,
        `ℹ️ <b>How to use Sarafu Bot</b>\n\n` +
        `${linked ? "✅ Your account is linked!\n\n" : "⚠️ You need to link/create an account first.\n\n"}` +
        `<b>Commands:</b>\n` +
        `• <b>Buy Tokens</b> - Browse and purchase crypto tokens\n` +
        `• <b>Portfolio</b> - View your token holdings\n` +
        `• <b>Deposit</b> - Add funds to your wallet\n` +
        `• <b>Reset Password</b> - Get a temporary password\n\n` +
        `All payments are processed via M-PESA. You'll receive an STK push on your phone.`,
        { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    // ── Register ──
    if (callbackData === "register") {
      await answerCallback();
      const existing = await findLinkedUser(telegramUserId);
      if (existing) {
        await sendMessage(chatId, `✅ You already have a linked account!`, linkedMenu);
        return ok();
      }
      await sendMessage(chatId,
        `📝 <b>Create Account</b>\n\nSend your details:\n\n<code>/register YourName 254712345678 YourPassword</code>`,
        { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    if (text.startsWith("/register ")) {
      const existing = await findLinkedUser(telegramUserId);
      if (existing) {
        await sendMessage(chatId, `✅ You already have an account!`, linkedMenu);
        return ok();
      }

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
        await sendMessage(chatId, `❌ ${authError.message}`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else if (authData.user) {
        await supabase.from("profiles").update({ full_name: fullName, phone: normalizePhone(phone) }).eq("user_id", authData.user.id);
        await saveTelegramLink(telegramUserId, authData.user.id);
        await sendMessage(chatId,
          `✅ <b>Account Created!</b>\n\nName: ${fullName}\nPhone: ${phone}\n\nYou're ready to trade!`,
          linkedMenu
        );
      }
      return ok();
    }

    // ── Link account ──
    if (callbackData === "link_account") {
      await answerCallback();
      const existing = await findLinkedUser(telegramUserId);
      if (existing) {
        await sendMessage(chatId, `✅ Your account is already linked!`, linkedMenu);
        return ok();
      }
      await sendMessage(chatId,
        `🔗 <b>Link Account</b>\n\nSend your login details:\n\n<code>/link your@email.com YourPassword</code>`,
        { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    if (text.startsWith("/link ")) {
      const existing = await findLinkedUser(telegramUserId);
      if (existing) {
        await sendMessage(chatId, `✅ Already linked!`, linkedMenu);
        return ok();
      }

      const parts = text.replace("/link ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: /link email password");
        return ok();
      }
      const [email, password] = parts;
      const { data: signIn, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError || !signIn.user) {
        await sendMessage(chatId, `❌ Login failed: ${signError?.message || "Unknown error"}`,
          { inline_keyboard: [[{ text: "🔄 Try Again", callback_data: "link_account" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else {
        await saveTelegramLink(telegramUserId, signIn.user.id);
        await sendMessage(chatId, `✅ <b>Account linked successfully!</b>`, linkedMenu);
      }
      return ok();
    }

    // ── Buy tokens: show coin list ──
    if (callbackData === "buy_tokens") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link or create an account first.", unlinkedMenu);
        return ok();
      }

      // Clear pending state
      await savePendingAmount(telegramUserId, null);

      const { data: coins } = await supabase
        .from("coins")
        .select("id, name, symbol, price")
        .eq("is_active", true)
        .eq("is_approved", true)
        .eq("trading_paused", false)
        .order("market_cap", { ascending: false, nullsFirst: false })
        .limit(10);

      if (!coins || coins.length === 0) {
        await sendMessage(chatId, "📭 No tokens available right now.",
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else {
        const buttons = coins.map((c: any) => [{
          text: `${c.name} (${c.symbol}) — KES ${Number(c.price).toFixed(2)}`,
          callback_data: `sel_${c.id}`,
        }]);
        buttons.push([{ text: "🏠 Main Menu", callback_data: "main_menu" }]);
        await sendMessage(chatId, "💰 <b>Select a token to buy:</b>", { inline_keyboard: buttons });
      }
      return ok();
    }

    // ── Token selected: show amount options ──
    if (callbackData?.startsWith("sel_")) {
      await answerCallback();
      const coinId = callbackData.replace("sel_", "");
      const { data: coin } = await supabase.from("coins").select("name, symbol, price").eq("id", coinId).maybeSingle();
      if (!coin) {
        await sendMessage(chatId, "❌ Token not found.",
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
        return ok();
      }
      await saveLastCoin(telegramUserId, coinId);
      await savePendingAmount(telegramUserId, null);

      const minAmount = await getMinBuyAmount();
      const tokensFor = (kes: number) => (kes / Number(coin.price)).toFixed(2);

      const presets = [500, 1000, 5000].filter(a => a >= minAmount);
      if (!presets.includes(minAmount)) presets.unshift(minAmount);
      const presetButtons = presets.map(a => [
        { text: `KES ${a.toLocaleString()} (~${tokensFor(a)} ${coin.symbol})`, callback_data: `amt_${coinId}_${a}` },
      ]);

      await sendMessage(chatId,
        `💰 <b>${coin.name} (${coin.symbol})</b>\nPrice: KES ${Number(coin.price).toFixed(4)}\nMin: KES ${minAmount.toLocaleString()}\n\nSelect amount to spend:`,
        {
          inline_keyboard: [
            ...presetButtons,
            [{ text: "✏️ Custom Amount", callback_data: `cust_${coinId}` }],
            [{ text: "⬅️ Back to Tokens", callback_data: "buy_tokens" }, { text: "🏠 Menu", callback_data: "main_menu" }],
          ],
        }
      );
      return ok();
    }

    // ── Custom amount prompt ──
    if (callbackData?.startsWith("cust_")) {
      await answerCallback();
      const coinId = callbackData.replace("cust_", "");
      await saveLastCoin(telegramUserId, coinId);
      await sendMessage(chatId,
        `✏️ <b>Enter custom amount</b>\n\nJust type the amount in KES, e.g.:\n\n<code>2500</code>`,
        { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `sel_${coinId}` }, { text: "🏠 Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    // ── Preset amount selected ──
    if (callbackData?.startsWith("amt_")) {
      await answerCallback();
      const parts = callbackData.replace("amt_", "").split("_");
      const coinId = parts[0];
      const amount = parseInt(parts[1]);
      const minAmount = await getMinBuyAmount();
      if (amount < minAmount) {
        await sendMessage(chatId, `❌ Minimum buy amount is KES ${minAmount}.`);
        return ok();
      }
      await confirmPurchase(chatId, telegramUserId, coinId, amount);
      return ok();
    }

    // ── Phone entry for different number ──
    if (callbackData?.startsWith("phn_")) {
      await answerCallback();
      const parts = callbackData.replace("phn_", "").split("_");
      const coinId = parts[0];
      const amount = parseInt(parts[1]);
      await saveLastCoin(telegramUserId, coinId);
      await savePendingAmount(telegramUserId, amount);
      await sendMessage(chatId,
        `📱 <b>Enter M-PESA Number</b>\n\nType the number to receive the STK push:\n<code>0712345678</code> or <code>254712345678</code>`,
        { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "buy_tokens" }]] }
      );
      return ok();
    }

    // ── Confirm pay via button ──
    if (callbackData?.startsWith("pay_")) {
      await answerCallback();
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

    // ── Handle /amount command (legacy) ──
    if (text.startsWith("/amount ")) {
      const parts = text.replace("/amount ", "").trim().split(/\s+/);
      let coinId: string | null = null;
      let amtStr: string;

      if (parts.length >= 2) {
        coinId = parts[0];
        amtStr = parts[1];
      } else {
        amtStr = parts[0];
        coinId = await getLastCoin(telegramUserId);
      }

      if (!coinId) {
        await sendMessage(chatId, "❌ Please select a token first.", { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }]] });
        return ok();
      }
      const amount = parseInt(amtStr);
      const minAmount = await getMinBuyAmount();
      if (!amount || amount < minAmount) {
        await sendMessage(chatId, `❌ Minimum amount is KES ${minAmount}.`);
        return ok();
      }
      await confirmPurchase(chatId, telegramUserId, coinId, amount);
      return ok();
    }

    // ── Handle phone number input — contextual: pending purchase or deposit ──
    if (isPhoneNumber(text)) {
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link your account first.", unlinkedMenu);
        return ok();
      }

      const phone = normalizePhone(text);
      const pendingAmount = await getPendingAmount(telegramUserId);
      const lastCoinId = await getLastCoin(telegramUserId);

      if (pendingAmount && pendingAmount > 0 && lastCoinId) {
        // There's a pending purchase — process it with this phone
        await processPurchase(chatId, telegramUserId, lastCoinId, pendingAmount, phone);
        return ok();
      }

      // No pending purchase — just save the phone
      await supabase.from("profiles").update({ phone }).eq("user_id", linked.user_id);
      await sendMessage(chatId,
        `✅ Phone saved: <b>${phone}</b>\n\nNow select a token and amount:`,
        linkedMenu
      );
      return ok();
    }

    // ── Handle plain number (custom amount for last selected coin) ──
    if (/^\d+$/.test(text.trim()) && !text.startsWith("/")) {
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link your account first.", unlinkedMenu);
        return ok();
      }

      const amount = parseInt(text.trim());
      const coinId = await getLastCoin(telegramUserId);
      if (coinId && amount > 0) {
        const minAmount = await getMinBuyAmount();
        if (amount < minAmount) {
          await sendMessage(chatId, `❌ Minimum amount is KES ${minAmount}.`);
          return ok();
        }
        await confirmPurchase(chatId, telegramUserId, coinId, amount);
        return ok();
      }
    }

    // ── Deposit ──
    if (callbackData === "deposit") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link your account first.", unlinkedMenu);
        return ok();
      }

      const minAmount = await getMinBuyAmount();
      await sendMessage(chatId,
        `💳 <b>Deposit to Wallet</b>\n\nSelect amount to deposit:`,
        {
          inline_keyboard: [
            [{ text: "KES 500", callback_data: "dep_500" }, { text: "KES 1,000", callback_data: "dep_1000" }],
            [{ text: "KES 5,000", callback_data: "dep_5000" }, { text: "KES 10,000", callback_data: "dep_10000" }],
            [{ text: "✏️ Custom Amount", callback_data: "dep_custom" }],
            [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
          ],
        }
      );
      return ok();
    }

    if (callbackData === "dep_custom") {
      await answerCallback();
      await sendMessage(chatId,
        `✏️ Type deposit amount:\n\n<code>/deposit 2500 254712345678</code>\n\n(Amount in KES, then your M-PESA number)`,
        { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    if (callbackData?.startsWith("dep_")) {
      await answerCallback();
      const amount = parseInt(callbackData.replace("dep_", ""));
      if (!amount) return ok();
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Link your account first.", unlinkedMenu);
        return ok();
      }
      const phone = linked.phone;
      if (phone && !phone.startsWith("tg_") && /^254\d{9}$/.test(phone)) {
        await sendMessage(chatId,
          `💳 <b>Confirm Deposit</b>\n\nAmount: KES ${amount.toLocaleString()}\n\nWhich M-PESA number?`,
          {
            inline_keyboard: [
              [{ text: `✅ Use ${phone}`, callback_data: `depay_${amount}_${phone}` }],
              [{ text: "📱 Different Number", callback_data: `dephn_${amount}` }],
              [{ text: "❌ Cancel", callback_data: "deposit" }],
            ],
          }
        );
      } else {
        await sendMessage(chatId,
          `📱 Enter your M-PESA number:\n\n<code>/deposit ${amount} 254712345678</code>`,
          { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "deposit" }]] }
        );
      }
      return ok();
    }

    if (callbackData?.startsWith("dephn_")) {
      await answerCallback();
      const amount = callbackData.replace("dephn_", "");
      await sendMessage(chatId,
        `📱 Enter M-PESA number:\n\n<code>/deposit ${amount} 254712345678</code>`,
        { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "deposit" }]] }
      );
      return ok();
    }

    if (callbackData?.startsWith("depay_")) {
      await answerCallback();
      const parts = callbackData.replace("depay_", "").split("_");
      const amount = parseInt(parts[0]);
      const phone = parts[1];
      await processDeposit(chatId, telegramUserId, amount, phone);
      return ok();
    }

    if (text.startsWith("/deposit ")) {
      const parts = text.replace("/deposit ", "").trim().split(/\s+/);
      if (parts.length < 2) {
        await sendMessage(chatId, "❌ Format: /deposit amount phone");
        return ok();
      }
      const amount = parseInt(parts[0]);
      let phone = parts[1];
      if (!amount || amount < 1) {
        await sendMessage(chatId, "❌ Invalid amount.");
        return ok();
      }
      phone = normalizePhone(phone);
      await processDeposit(chatId, telegramUserId, amount, phone);
      return ok();
    }

    // ── Portfolio ──
    if (callbackData === "portfolio") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      if (!linked) {
        await sendMessage(chatId, "❌ Please link your account first.", unlinkedMenu);
        return ok();
      }

      const [holdingsRes, walletRes] = await Promise.all([
        supabase
          .from("holdings")
          .select("amount, average_buy_price, coin_id, coins(name, symbol, price)")
          .eq("user_id", linked.user_id)
          .gt("amount", 0),
        supabase
          .from("wallets")
          .select("fiat_balance")
          .eq("user_id", linked.user_id)
          .maybeSingle(),
      ]);

      const holdings = holdingsRes.data;
      const wallet = walletRes.data;

      let msg = "📊 <b>Your Portfolio</b>\n\n";
      msg += `💳 Wallet: <b>KES ${Number(wallet?.fiat_balance || 0).toLocaleString()}</b>\n\n`;

      if (!holdings || holdings.length === 0) {
        msg += "No token holdings yet.";
      } else {
        let totalValue = 0;
        for (const h of holdings) {
          const coin = (h as any).coins;
          if (!coin) continue;
          const value = Number(h.amount) * Number(coin.price);
          totalValue += value;
          const pnl = ((Number(coin.price) - Number(h.average_buy_price)) / Number(h.average_buy_price) * 100);
          const pnlIcon = pnl >= 0 ? "📈" : "📉";
          msg += `• <b>${coin.name}</b> (${coin.symbol})\n  ${Number(h.amount).toFixed(2)} tokens ≈ KES ${value.toFixed(2)} ${pnlIcon} ${pnl.toFixed(1)}%\n\n`;
        }
        msg += `\n💰 Total Holdings: <b>KES ${totalValue.toFixed(2)}</b>`;
      }

      await sendMessage(chatId, msg,
        { inline_keyboard: [[{ text: "💰 Buy Tokens", callback_data: "buy_tokens" }], [{ text: "💳 Deposit", callback_data: "deposit" }], [{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
      );
      return ok();
    }

    // ── Forgot password ──
    if (callbackData === "forgot_password") {
      await answerCallback();
      const linked = await findLinkedUser(telegramUserId);
      if (linked) {
        // Linked user — we can reset directly, generate temp password
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
        const { error: updateError } = await supabase.auth.admin.updateUserById(linked.user_id, { password: tempPassword });
        if (updateError) {
          await sendMessage(chatId, `❌ Failed: ${updateError.message}`,
            { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        } else {
          await sendMessage(chatId,
            `✅ <b>New Temporary Password</b>\n\n<code>${tempPassword}</code>\n\n⚠️ Change this after logging in on the website.`,
            linkedMenu
          );
        }
      } else {
        await sendMessage(chatId,
          `🔑 <b>Reset Password</b>\n\nSend your email and phone to verify:\n\n<code>/forgot your@email.com 254712345678</code>`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      }
      return ok();
    }

    if (text.startsWith("/forgot ")) {
      const parts = text.replace("/forgot ", "").trim().split(/\s+/);
      if (parts.length < 1) {
        await sendMessage(chatId, "❌ Format: /forgot email [phone]");
        return ok();
      }

      const email = parts[0];
      const phone = parts[1];
      const linked = await findLinkedUser(telegramUserId);

      if (linked) {
        // Already linked — just reset password directly
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
        const { error: updateError } = await supabase.auth.admin.updateUserById(linked.user_id, { password: tempPassword });
        if (updateError) {
          await sendMessage(chatId, `❌ Failed: ${updateError.message}`,
            { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
          );
        } else {
          await sendMessage(chatId,
            `✅ <b>Temporary Password</b>\n\n<code>${tempPassword}</code>\n\n⚠️ Change this after logging in.`,
            linkedMenu
          );
        }
        return ok();
      }

      // Not linked — verify email + phone
      if (!phone) {
        await sendMessage(chatId, "❌ Please include your phone: /forgot email phone");
        return ok();
      }
      const normalizedPhone = normalizePhone(phone);
      const { data: profile } = await supabase.from("profiles").select("user_id, email, phone").eq("email", email).maybeSingle();
      if (!profile || (profile.phone !== normalizedPhone && profile.phone !== phone)) {
        await sendMessage(chatId, "❌ Email and phone don't match our records.",
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
        return ok();
      }

      // Auto-link
      await saveTelegramLink(telegramUserId, profile.user_id);
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      const { error: updateError } = await supabase.auth.admin.updateUserById(profile.user_id, { password: tempPassword });
      if (updateError) {
        await sendMessage(chatId, `❌ Failed: ${updateError.message}`,
          { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "main_menu" }]] }
        );
      } else {
        await sendMessage(chatId,
          `✅ <b>Account linked & password reset!</b>\n\n<code>${tempPassword}</code>\n\n⚠️ Change this after logging in.`,
          linkedMenu
        );
      }
      return ok();
    }

    // ── Fallback ──
    const linked = await findLinkedUser(telegramUserId);
    await sendMessage(chatId,
      `🤔 I didn't understand that.\n\nUse the menu below:`,
      linked ? linkedMenu : unlinkedMenu
    );

    return ok();
  } catch (error) {
    console.error("Telegram bot error:", error);
    return ok();
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
