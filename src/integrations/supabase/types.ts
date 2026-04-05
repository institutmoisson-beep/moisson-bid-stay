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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      needs: {
        Row: {
          budget: number
          capacity: number
          check_in: string | null
          check_out: string | null
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          neighborhood: string
          status: string
          type_needed: string
          updated_at: string
          user_id: string
          whatsapp_contact: string
        }
        Insert: {
          budget?: number
          capacity?: number
          check_in?: string | null
          check_out?: string | null
          city: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          neighborhood: string
          status?: string
          type_needed?: string
          updated_at?: string
          user_id: string
          whatsapp_contact: string
        }
        Update: {
          budget?: number
          capacity?: number
          check_in?: string | null
          check_out?: string | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          neighborhood?: string
          status?: string
          type_needed?: string
          updated_at?: string
          user_id?: string
          whatsapp_contact?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          need_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          need_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          need_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          host_id: string
          host_message: string | null
          id: string
          need_id: string
          payment_method: string
          residence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          host_id: string
          host_message?: string | null
          id?: string
          need_id: string
          payment_method?: string
          residence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          host_id?: string
          host_message?: string | null
          id?: string
          need_id?: string
          payment_method?: string
          residence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "residences"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          details: string
          id: string
          is_active: boolean
          link: string | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          details: string
          id?: string
          is_active?: boolean
          link?: string | null
          name: string
          type: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          is_active?: boolean
          link?: string | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          moissonneur_code: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          moissonneur_code: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          moissonneur_code?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      residence_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          residence_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          residence_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          residence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residence_images_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "residences"
            referencedColumns: ["id"]
          },
        ]
      }
      residences: {
        Row: {
          address: string
          amenities: string[] | null
          bedrooms: number
          capacity: number
          city: string
          country: string
          created_at: string
          description: string | null
          facebook_url: string | null
          gps_lat: number | null
          gps_lng: number | null
          host_id: string
          id: string
          is_published: boolean
          min_price: number
          name: string
          neighborhood: string
          type: string
          updated_at: string
          whatsapp_contact: string
        }
        Insert: {
          address: string
          amenities?: string[] | null
          bedrooms?: number
          capacity?: number
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          host_id: string
          id?: string
          is_published?: boolean
          min_price?: number
          name: string
          neighborhood?: string
          type?: string
          updated_at?: string
          whatsapp_contact?: string
        }
        Update: {
          address?: string
          amenities?: string[] | null
          bedrooms?: number
          capacity?: number
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          host_id?: string
          id?: string
          is_published?: boolean
          min_price?: number
          name?: string
          neighborhood?: string
          type?: string
          updated_at?: string
          whatsapp_contact?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          payment_method_id: string | null
          recipient_code: string | null
          recipient_email: string | null
          reference: string | null
          status: string
          transaction_id_external: string | null
          type: string
          user_id: string
          withdrawal_contact: string | null
          withdrawal_method: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method_id?: string | null
          recipient_code?: string | null
          recipient_email?: string | null
          reference?: string | null
          status?: string
          transaction_id_external?: string | null
          type: string
          user_id: string
          withdrawal_contact?: string | null
          withdrawal_method?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method_id?: string | null
          recipient_code?: string | null
          recipient_email?: string | null
          reference?: string | null
          status?: string
          transaction_id_external?: string | null
          type?: string
          user_id?: string
          withdrawal_contact?: string | null
          withdrawal_method?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_wallet_transaction: {
        Args: { admin_id: string; transaction_id: string }
        Returns: boolean
      }
      generate_moissonneur_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_wallet_transfer: {
        Args: {
          recipient_identifier: string
          sender_id: string
          transfer_amount: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "financier"
        | "hotel_manager"
        | "stand_manager"
        | "needs_manager"
        | "commercial"
        | "communication"
        | "it_manager"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "financier",
        "hotel_manager",
        "stand_manager",
        "needs_manager",
        "commercial",
        "communication",
        "it_manager",
      ],
    },
  },
} as const
