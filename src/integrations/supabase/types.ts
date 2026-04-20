export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_words: {
        Row: {
          created_at: string
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      coins: {
        Row: {
          approval_status: string | null
          bonding_curve_factor: number
          burned_supply: number
          circulating_supply: number
          circulating_supply_override: number | null
          contract_address: string | null
          created_at: string
          creation_fee_paid: boolean
          creator_id: string | null
          description: string | null
          discord_url: string | null
          holders_count: number
          holders_override: number | null
          id: string
          initial_price: number
          is_active: boolean
          is_approved: boolean
          is_featured: boolean
          is_trending: boolean
          liquidity: number
          liquidity_override: number | null
          logo_url: string | null
          market_cap: number | null
          market_cap_override: number | null
          name: string
          price: number
          price_change_24h_override: number | null
          symbol: string
          telegram_url: string | null
          total_supply: number
          trading_paused: boolean
          twitter_url: string | null
          updated_at: string
          use_circulating_supply_override: boolean
          use_holders_override: boolean
          use_liquidity_override: boolean
          use_market_cap_override: boolean
          use_price_change_24h_override: boolean
          use_volatility_override: boolean
          volatility: number
          volatility_override: number | null
          website_url: string | null
          whitepaper_url: string | null
        }
        Insert: {
          approval_status?: string | null
          bonding_curve_factor?: number
          burned_supply?: number
          circulating_supply?: number
          circulating_supply_override?: number | null
          contract_address?: string | null
          created_at?: string
          creation_fee_paid?: boolean
          creator_id?: string | null
          description?: string | null
          discord_url?: string | null
          holders_count?: number
          holders_override?: number | null
          id?: string
          initial_price?: number
          is_active?: boolean
          is_approved?: boolean
          is_featured?: boolean
          is_trending?: boolean
          liquidity?: number
          liquidity_override?: number | null
          logo_url?: string | null
          market_cap?: number | null
          market_cap_override?: number | null
          name: string
          price?: number
          price_change_24h_override?: number | null
          symbol: string
          telegram_url?: string | null
          total_supply?: number
          trading_paused?: boolean
          twitter_url?: string | null
          updated_at?: string
          use_circulating_supply_override?: boolean
          use_holders_override?: boolean
          use_liquidity_override?: boolean
          use_market_cap_override?: boolean
          use_price_change_24h_override?: boolean
          use_volatility_override?: boolean
          volatility?: number
          volatility_override?: number | null
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Update: {
          approval_status?: string | null
          bonding_curve_factor?: number
          burned_supply?: number
          circulating_supply?: number
          circulating_supply_override?: number | null
          contract_address?: string | null
          created_at?: string
          creation_fee_paid?: boolean
          creator_id?: string | null
          description?: string | null
          discord_url?: string | null
          holders_count?: number
          holders_override?: number | null
          id?: string
          initial_price?: number
          is_active?: boolean
          is_approved?: boolean
          is_featured?: boolean
          is_trending?: boolean
          liquidity?: number
          liquidity_override?: number | null
          logo_url?: string | null
          market_cap?: number | null
          market_cap_override?: number | null
          name?: string
          price?: number
          price_change_24h_override?: number | null
          symbol?: string
          telegram_url?: string | null
          total_supply?: number
          trading_paused?: boolean
          twitter_url?: string | null
          updated_at?: string
          use_circulating_supply_override?: boolean
          use_holders_override?: boolean
          use_liquidity_override?: boolean
          use_market_cap_override?: boolean
          use_price_change_24h_override?: boolean
          use_volatility_override?: boolean
          volatility?: number
          volatility_override?: number | null
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Relationships: []
      }
      commission_transactions: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string
          id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          commission_rate: number
          created_at?: string
          id?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          amount: number
          average_buy_price: number
          coin_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          average_buy_price?: number
          coin_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          average_buy_price?: number
          coin_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          admin_override: boolean
          coin_id: string
          created_at: string
          creator_id: string
          description: string | null
          expires_at: string
          fee_paid: number
          id: string
          instagram_username: string | null
          is_active: boolean
          kick_username: string | null
          tiktok_username: string | null
          title: string | null
          twitch_username: string | null
          updated_at: string
          youtube_username: string | null
        }
        Insert: {
          admin_override?: boolean
          coin_id: string
          created_at?: string
          creator_id: string
          description?: string | null
          expires_at?: string
          fee_paid?: number
          id?: string
          instagram_username?: string | null
          is_active?: boolean
          kick_username?: string | null
          tiktok_username?: string | null
          title?: string | null
          twitch_username?: string | null
          updated_at?: string
          youtube_username?: string | null
        }
        Update: {
          admin_override?: boolean
          coin_id?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          expires_at?: string
          fee_paid?: number
          id?: string
          instagram_username?: string | null
          is_active?: boolean
          kick_username?: string | null
          tiktok_username?: string | null
          title?: string | null
          twitch_username?: string | null
          updated_at?: string
          youtube_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_config: {
        Row: {
          b2c_command_id: string | null
          b2c_result_url: string | null
          b2c_timeout_url: string | null
          callback_url: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          id: string
          initiator_name: string | null
          is_sandbox: boolean
          passkey: string | null
          paybill_number: string
          security_credential: string | null
          updated_at: string
        }
        Insert: {
          b2c_command_id?: string | null
          b2c_result_url?: string | null
          b2c_timeout_url?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          initiator_name?: string | null
          is_sandbox?: boolean
          passkey?: string | null
          paybill_number: string
          security_credential?: string | null
          updated_at?: string
        }
        Update: {
          b2c_command_id?: string | null
          b2c_result_url?: string | null
          b2c_timeout_url?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          initiator_name?: string | null
          is_sandbox?: boolean
          passkey?: string | null
          paybill_number?: string
          security_credential?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          body: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          recipient: string
          status: string
          subject: string | null
          template_slug: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient: string
          status?: string
          subject?: string | null
          template_slug?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient?: string
          status?: string
          subject?: string | null
          template_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          category: string
          created_at: string
          email_body: string
          id: string
          is_email_enabled: boolean
          is_sms_enabled: boolean
          is_whatsapp_enabled: boolean
          name: string
          slug: string
          sms_body: string
          subject: string
          updated_at: string
          variables: string[]
          whatsapp_body: string
        }
        Insert: {
          category?: string
          created_at?: string
          email_body?: string
          id?: string
          is_email_enabled?: boolean
          is_sms_enabled?: boolean
          is_whatsapp_enabled?: boolean
          name: string
          slug: string
          sms_body?: string
          subject?: string
          updated_at?: string
          variables?: string[]
          whatsapp_body?: string
        }
        Update: {
          category?: string
          created_at?: string
          email_body?: string
          id?: string
          is_email_enabled?: boolean
          is_sms_enabled?: boolean
          is_whatsapp_enabled?: boolean
          name?: string
          slug?: string
          sms_body?: string
          subject?: string
          updated_at?: string
          variables?: string[]
          whatsapp_body?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          origin: string | null
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          origin?: string | null
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          origin?: string | null
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          checkout_request_id: string | null
          coin_id: string | null
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          phone: string
          result_desc: string | null
          status: string
          type: Database["public"]["Enums"]["payment_request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          coin_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone: string
          result_desc?: string | null
          status?: string
          type: Database["public"]["Enums"]["payment_request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          coin_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone?: string
          result_desc?: string | null
          status?: string
          type?: Database["public"]["Enums"]["payment_request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      price_history: {
        Row: {
          coin_id: string
          created_at: string
          id: string
          price: number
          trade_type: string
          volume: number
        }
        Insert: {
          coin_id: string
          created_at?: string
          id?: string
          price: number
          trade_type?: string
          volume?: number
        }
        Update: {
          coin_id?: string
          created_at?: string
          id?: string
          price?: number
          trade_type?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          telegram_first_name: string | null
          telegram_user_id: string | null
          telegram_username: string | null
          two_factor_enabled: boolean
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          telegram_first_name?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          telegram_first_name?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          referral_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          referral_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referral_id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          channels: string[]
          created_at: string
          email_body: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string
          run_count: number
          sms_body: string | null
          subject: string | null
          target: string
          target_user_ids: string[]
          template_slug: string | null
          updated_at: string
          whatsapp_body: string | null
        }
        Insert: {
          channels?: string[]
          created_at?: string
          email_body?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at: string
          run_count?: number
          sms_body?: string | null
          subject?: string | null
          target?: string
          target_user_ids?: string[]
          template_slug?: string | null
          updated_at?: string
          whatsapp_body?: string | null
        }
        Update: {
          channels?: string[]
          created_at?: string
          email_body?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string
          run_count?: number
          sms_body?: string | null
          subject?: string | null
          target?: string
          target_user_ids?: string[]
          template_slug?: string | null
          updated_at?: string
          whatsapp_body?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          admin_commission: number
          allow_2fa_optional: boolean
          coin_creation_fee: number
          created_at: string
          creator_commission_percentage: number
          cta_subtitle: string | null
          cta_title: string | null
          deposit_fee_percentage: number
          discord_url: string | null
          email_provider: string
          facebook_url: string | null
          feature_1_description: string | null
          feature_1_title: string | null
          feature_2_description: string | null
          feature_2_title: string | null
          feature_3_description: string | null
          feature_3_title: string | null
          feature_4_description: string | null
          feature_4_title: string | null
          fee_percentage: number
          google_auth_enabled: boolean
          google_verification_code: string | null
          hero_badge: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          live_fee: number
          logo_url: string | null
          max_buy_amount: number
          min_buy_amount: number
          primary_color: string | null
          referral_commission_percentage: number
          require_2fa: boolean
          require_email_verification: boolean
          require_phone_verification: boolean
          seo_keywords: string | null
          site_description: string | null
          site_name: string
          stats_tokens: string | null
          stats_traders: string | null
          stats_uptime: string | null
          stats_volume: string | null
          telegram_auth_enabled: boolean
          telegram_url: string | null
          twitter_url: string | null
          updated_at: string
          withdrawal_fee_percentage: number
        }
        Insert: {
          admin_commission?: number
          allow_2fa_optional?: boolean
          coin_creation_fee?: number
          created_at?: string
          creator_commission_percentage?: number
          cta_subtitle?: string | null
          cta_title?: string | null
          deposit_fee_percentage?: number
          discord_url?: string | null
          email_provider?: string
          facebook_url?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          feature_4_description?: string | null
          feature_4_title?: string | null
          fee_percentage?: number
          google_auth_enabled?: boolean
          google_verification_code?: string | null
          hero_badge?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          live_fee?: number
          logo_url?: string | null
          max_buy_amount?: number
          min_buy_amount?: number
          primary_color?: string | null
          referral_commission_percentage?: number
          require_2fa?: boolean
          require_email_verification?: boolean
          require_phone_verification?: boolean
          seo_keywords?: string | null
          site_description?: string | null
          site_name?: string
          stats_tokens?: string | null
          stats_traders?: string | null
          stats_uptime?: string | null
          stats_volume?: string | null
          telegram_auth_enabled?: boolean
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          withdrawal_fee_percentage?: number
        }
        Update: {
          admin_commission?: number
          allow_2fa_optional?: boolean
          coin_creation_fee?: number
          created_at?: string
          creator_commission_percentage?: number
          cta_subtitle?: string | null
          cta_title?: string | null
          deposit_fee_percentage?: number
          discord_url?: string | null
          email_provider?: string
          facebook_url?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          feature_4_description?: string | null
          feature_4_title?: string | null
          fee_percentage?: number
          google_auth_enabled?: boolean
          google_verification_code?: string | null
          hero_badge?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          live_fee?: number
          logo_url?: string | null
          max_buy_amount?: number
          min_buy_amount?: number
          primary_color?: string | null
          referral_commission_percentage?: number
          require_2fa?: boolean
          require_email_verification?: boolean
          require_phone_verification?: boolean
          seo_keywords?: string | null
          site_description?: string | null
          site_name?: string
          stats_tokens?: string | null
          stats_traders?: string | null
          stats_uptime?: string | null
          stats_volume?: string | null
          telegram_auth_enabled?: boolean
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          withdrawal_fee_percentage?: number
        }
        Relationships: []
      }
      sms_config: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          sender_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          encryption: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      telegram_config: {
        Row: {
          auth_enabled: boolean
          bot_token: string | null
          bot_username: string | null
          chat_id: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          auth_enabled?: boolean
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          auth_enabled?: boolean
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          chat_id: string | null
          created_at: string
          id: string
          last_selected_coin_id: string | null
          pending_amount: number | null
          telegram_id: string
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: string
          last_selected_coin_id?: string | null
          pending_amount?: number | null
          telegram_id: string
          user_id: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: string
          last_selected_coin_id?: string | null
          pending_amount?: number | null
          telegram_id?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          coin_id: string
          created_at: string
          id: string
          mpesa_receipt: string | null
          phone: string | null
          price_per_coin: number
          status: string
          total_value: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_id: string
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          phone?: string | null
          price_per_coin: number
          status?: string
          total_value: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_id?: string
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          phone?: string | null
          price_per_coin?: number
          status?: string
          total_value?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          checkout_request_id: string | null
          created_at: string
          fee_amount: number
          id: string
          mpesa_receipt: string | null
          net_amount: number
          phone: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          checkout_request_id?: string | null
          created_at?: string
          fee_amount?: number
          id?: string
          mpesa_receipt?: string | null
          net_amount: number
          phone: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          checkout_request_id?: string | null
          created_at?: string
          fee_amount?: number
          id?: string
          mpesa_receipt?: string | null
          net_amount?: number
          phone?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          fiat_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fiat_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fiat_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          api_token: string
          business_account_id: string
          created_at: string
          id: string
          is_active: boolean
          phone_number_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_token?: string
          business_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string
          provider?: string
          updated_at?: string
        }
        Update: {
          api_token?: string
          business_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_bonding_price: {
        Args: {
          _bonding_factor: number
          _circulating_supply: number
          _initial_price: number
        }
        Returns: number
      }
      complete_mpesa_buy: {
        Args: { _mpesa_receipt: string; _transaction_id: string }
        Returns: Json
      }
      complete_mpesa_deposit: {
        Args: { _mpesa_receipt: string; _payment_request_id: string }
        Returns: Json
      }
      execute_trade: {
        Args: {
          _amount: number
          _coin_id: string
          _to_wallet: boolean
          _trade_type: string
          _use_wallet: boolean
          _user_id: string
        }
        Returns: Json
      }
      expire_live_streams: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      get_base_url: { Args: never; Returns: string }
      get_coin_price_changes_24h: {
        Args: never
        Returns: {
          coin_id: string
          price_change_24h: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      link_telegram_user: {
        Args: {
          _telegram_first_name?: string
          _telegram_id: string
          _telegram_username?: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "coin_creator" | "user" | "banned"
      payment_request_type: "deposit" | "coin_creation"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "coin_creator", "user", "banned"],
      payment_request_type: ["deposit", "coin_creation"],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "failed",
      ],
    },
  },
} as const
