export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined
    }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ledger_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          ledger_id: string
          revoked_at: string | null
          role: string
          token_hash: string
        }
        ComputedFields: never
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email: string
          expires_at?: string
          id?: string
          ledger_id: string
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          ledger_id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ledger_invites_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
        ]
      }
      ledger_members: {
        Row: {
          calendar_sync: boolean
          display_name: string | null
          joined_at: string
          ledger_id: string
          notify_channels: string[]
          role: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          calendar_sync?: boolean
          display_name?: string | null
          joined_at?: string
          ledger_id: string
          notify_channels?: string[]
          role: string
          user_id: string
        }
        Update: {
          calendar_sync?: boolean
          display_name?: string | null
          joined_at?: string
          ledger_id?: string
          notify_channels?: string[]
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ledger_members_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
        ]
      }
      ledgers: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string
          id: string
          name: string
          next_income_on: string | null
          reminder_defaults: Json | null
          subscription_defaults: Json | null
          time_zone: string
          updated_at: string
          version: number
          week_starts_on: number
        }
        ComputedFields: never
        Insert: {
          base_currency?: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
          next_income_on?: string | null
          reminder_defaults?: Json | null
          subscription_defaults?: Json | null
          time_zone?: string
          updated_at?: string
          version?: number
          week_starts_on?: number
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          next_income_on?: string | null
          reminder_defaults?: Json | null
          subscription_defaults?: Json | null
          time_zone?: string
          updated_at?: string
          version?: number
          week_starts_on?: number
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          last_ledger_id: string | null
          locale: string
          overview_layout: Json | null
          theme: string
          updated_at: string
          user_id: string
          version: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          last_ledger_id?: string | null
          locale?: string
          overview_layout?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          last_ledger_id?: string | null
          locale?: string
          overview_layout?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'user_settings_last_ledger_id_fkey'
            columns: [
              'last_ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | {
        schema: keyof DatabaseWithoutInternals
      },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | {
        schema: keyof DatabaseWithoutInternals
      },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | {
        schema: keyof DatabaseWithoutInternals
      },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
