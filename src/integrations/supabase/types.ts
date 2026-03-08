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
          symbol: string
          telegram_url: string | null
          total_supply: number
          trading_paused: boolean
          twitter_url: string | null
          updated_at: string
          use_holders_override: boolean
          use_liquidity_override: boolean
          use_market_cap_override: boolean
          volatility: number
          website_url: string | null
          whitepaper_url: string | null
        }
        Insert: {
          approval_status?: string | null
          bonding_curve_factor?: number
          burned_supply?: number
          circulating_supply?: number
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
          symbol: string
          telegram_url?: string | null
          total_supply?: number
          trading_paused?: boolean
          twitter_url?: string | null
          updated_at?: string
          use_holders_override?: boolean
          use_liquidity_override?: boolean
          use_market_cap_override?: boolean
          volatility?: number
          website_url?: string | null
          whitepaper_url?: string | null
        }
        Update: {
          approval_status?: string | null
          bonding_curve_factor?: number
          burned_supply?: number
          circulating_supply?: number
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
          symbol?: string
          telegram_url?: string | null
          total_supply?: number
          trading_paused?: boolean
          twitter_url?: string | null
          updated_at?: string
          use_holders_override?: boolean
          use_liquidity_override?: boolean
          use_market_cap_override?: boolean
          volatility?: number
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
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
          referral_code?: string | null
          referred_by?: string | null
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
          referral_code?: string | null
          referred_by?: string | null
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
      site_settings: {
        Row: {
          admin_commission: number
          coin_creation_fee: number
          created_at: string
          creator_commission_percentage: number
          cta_subtitle: string | null
          cta_title: string | null
          deposit_fee_percentage: number
          discord_url: string | null
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
          google_verification_code: string | null
          hero_badge: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          max_buy_amount: number
          min_buy_amount: number
          primary_color: string | null
          referral_commission_percentage: number
          seo_keywords: string | null
          site_description: string | null
          site_name: string
          stats_tokens: string | null
          stats_traders: string | null
          stats_uptime: string | null
          stats_volume: string | null
          telegram_url: string | null
          twitter_url: string | null
          updated_at: string
          withdrawal_fee_percentage: number
        }
        Insert: {
          admin_commission?: number
          coin_creation_fee?: number
          created_at?: string
          creator_commission_percentage?: number
          cta_subtitle?: string | null
          cta_title?: string | null
          deposit_fee_percentage?: number
          discord_url?: string | null
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
          google_verification_code?: string | null
          hero_badge?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_buy_amount?: number
          min_buy_amount?: number
          primary_color?: string | null
          referral_commission_percentage?: number
          seo_keywords?: string | null
          site_description?: string | null
          site_name?: string
          stats_tokens?: string | null
          stats_traders?: string | null
          stats_uptime?: string | null
          stats_volume?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          withdrawal_fee_percentage?: number
        }
        Update: {
          admin_commission?: number
          coin_creation_fee?: number
          created_at?: string
          creator_commission_percentage?: number
          cta_subtitle?: string | null
          cta_title?: string | null
          deposit_fee_percentage?: number
          discord_url?: string | null
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
          google_verification_code?: string | null
          hero_badge?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          max_buy_amount?: number
          min_buy_amount?: number
          primary_color?: string | null
          referral_commission_percentage?: number
          seo_keywords?: string | null
          site_description?: string | null
          site_name?: string
          stats_tokens?: string | null
          stats_traders?: string | null
          stats_uptime?: string | null
          stats_volume?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          withdrawal_fee_percentage?: number
        }
        Relationships: []
      }
      telegram_config: {
        Row: {
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
      generate_referral_code: { Args: never; Returns: string }
      get_base_url: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
