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
      accounts: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          currency: string
          icon: string | null
          id: string
          include_in_available: boolean
          include_in_total: boolean
          kind: string
          ledger_id: string
          name: string
          opening_balance_minor: number
          opening_balance_on: string
          sort_order: number
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          icon?: string | null
          id?: string
          include_in_available?: boolean
          include_in_total?: boolean
          kind: string
          ledger_id: string
          name: string
          opening_balance_minor?: number
          opening_balance_on: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          icon?: string | null
          id?: string
          include_in_available?: boolean
          include_in_total?: boolean
          kind?: string
          ledger_id?: string
          name?: string
          opening_balance_minor?: number
          opening_balance_on?: string
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'accounts_ledger_id_fkey'
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
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ledger_id: string
          mime: string
          owner_id: string
          owner_type: string
          size_bytes: number
          storage_path: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id: string
          mime: string
          owner_id: string
          owner_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id?: string
          mime?: string
          owner_id?: string
          owner_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attachments_ledger_id_fkey'
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
      categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          kind: string
          ledger_id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          kind: string
          ledger_id: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          kind?: string
          ledger_id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'categories_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
          {
            foreignKeyName: 'categories_parent_fkey'
            columns: [
              'ledger_id',
              'parent_id',
              'kind',
            ]
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: [
              'ledger_id',
              'id',
              'kind',
            ]
          },
        ]
      }
      fx_rates: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string | null
          id: string
          ledger_id: string
          quote_currency: string
          rate: number
          rate_on: string
          source: string
          source_name: string | null
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          base_currency: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id: string
          quote_currency: string
          rate: number
          rate_on: string
          source?: string
          source_name?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id?: string
          quote_currency?: string
          rate?: number
          rate_on?: string
          source?: string
          source_name?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'fx_rates_ledger_id_fkey'
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      obligation_payments: {
        Row: {
          amount_minor: number
          created_at: string
          created_by: string | null
          id: string
          ledger_id: string
          obligation_id: string
          operation_id: string
        }
        ComputedFields: never
        Insert: {
          amount_minor: number
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id: string
          obligation_id: string
          operation_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id?: string
          obligation_id?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'obligation_payments_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
          {
            foreignKeyName: 'obligation_payments_obligation_fkey'
            columns: [
              'ledger_id',
              'obligation_id',
            ]
            isOneToOne: false
            referencedRelation: 'obligation_states'
            referencedColumns: [
              'ledger_id',
              'obligation_id',
            ]
          },
          {
            foreignKeyName: 'obligation_payments_obligation_fkey'
            columns: [
              'ledger_id',
              'obligation_id',
            ]
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'obligation_payments_operation_fkey'
            columns: [
              'ledger_id',
              'operation_id',
            ]
            isOneToOne: false
            referencedRelation: 'operations'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
        ]
      }
      obligations: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          due_on: string
          id: string
          ledger_id: string
          lifecycle: string
          occurrence_on: string
          planned_amount_minor: number | null
          replaced_by_id: string | null
          sequence_no: number | null
          settled_at: string | null
          settled_by: string | null
          source_id: string | null
          source_type: string
          title: string
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          direction?: string
          due_on: string
          id?: string
          ledger_id: string
          lifecycle?: string
          occurrence_on: string
          planned_amount_minor?: number | null
          replaced_by_id?: string | null
          sequence_no?: number | null
          settled_at?: string | null
          settled_by?: string | null
          source_id?: string | null
          source_type?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          due_on?: string
          id?: string
          ledger_id?: string
          lifecycle?: string
          occurrence_on?: string
          planned_amount_minor?: number | null
          replaced_by_id?: string | null
          sequence_no?: number | null
          settled_at?: string | null
          settled_by?: string | null
          source_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'obligations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
            ]
            isOneToOne: false
            referencedRelation: 'account_balances'
            referencedColumns: [
              'ledger_id',
              'account_id',
            ]
          },
          {
            foreignKeyName: 'obligations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
            ]
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'obligations_category_fkey'
            columns: [
              'ledger_id',
              'category_id',
            ]
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'obligations_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
          {
            foreignKeyName: 'obligations_replaced_by_fkey'
            columns: [
              'ledger_id',
              'replaced_by_id',
            ]
            isOneToOne: false
            referencedRelation: 'obligation_states'
            referencedColumns: [
              'ledger_id',
              'obligation_id',
            ]
          },
          {
            foreignKeyName: 'obligations_replaced_by_fkey'
            columns: [
              'ledger_id',
              'replaced_by_id',
            ]
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
        ]
      }
      operations: {
        Row: {
          account_id: string
          amount_minor: number
          base_amount_minor: number | null
          base_currency: string
          category_id: string | null
          category_kind: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          duplicated_from_id: string | null
          fx_rate: number | null
          fx_rate_on: string | null
          fx_source: string | null
          id: string
          kind: string
          ledger_id: string
          note: string | null
          occurred_at: string
          occurred_on: string
          refund_of_id: string | null
          transfer_id: string | null
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          account_id: string
          amount_minor: number
          base_amount_minor?: number | null
          base_currency: string
          category_id?: string | null
          category_kind?: never
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          direction: string
          duplicated_from_id?: string | null
          fx_rate?: number | null
          fx_rate_on?: string | null
          fx_source?: string | null
          id?: string
          kind: string
          ledger_id: string
          note?: string | null
          occurred_at: string
          occurred_on: string
          refund_of_id?: string | null
          transfer_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string
          amount_minor?: number
          base_amount_minor?: number | null
          base_currency?: string
          category_id?: string | null
          category_kind?: never
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          duplicated_from_id?: string | null
          fx_rate?: number | null
          fx_rate_on?: string | null
          fx_source?: string | null
          id?: string
          kind?: string
          ledger_id?: string
          note?: string | null
          occurred_at?: string
          occurred_on?: string
          refund_of_id?: string | null
          transfer_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'operations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
              'currency',
            ]
            isOneToOne: false
            referencedRelation: 'account_balances'
            referencedColumns: [
              'ledger_id',
              'account_id',
              'currency',
            ]
          },
          {
            foreignKeyName: 'operations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
              'currency',
            ]
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: [
              'ledger_id',
              'id',
              'currency',
            ]
          },
          {
            foreignKeyName: 'operations_category_fkey'
            columns: [
              'ledger_id',
              'category_id',
              'category_kind',
            ]
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: [
              'ledger_id',
              'id',
              'kind',
            ]
          },
          {
            foreignKeyName: 'operations_duplicated_from_fkey'
            columns: [
              'ledger_id',
              'duplicated_from_id',
            ]
            isOneToOne: false
            referencedRelation: 'operations'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'operations_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
          {
            foreignKeyName: 'operations_refund_of_fkey'
            columns: [
              'ledger_id',
              'refund_of_id',
            ]
            isOneToOne: false
            referencedRelation: 'operations'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'operations_transfer_fkey'
            columns: [
              'ledger_id',
              'transfer_id',
            ]
            isOneToOne: false
            referencedRelation: 'transfers'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          created_by: string | null
          fee_minor: number | null
          from_account_id: string
          from_amount_minor: number
          from_currency: string
          id: string
          ledger_id: string
          note: string | null
          occurred_at: string
          to_account_id: string
          to_amount_minor: number
          to_currency: string
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          fee_minor?: number | null
          from_account_id: string
          from_amount_minor: number
          from_currency: string
          id?: string
          ledger_id: string
          note?: string | null
          occurred_at: string
          to_account_id: string
          to_amount_minor: number
          to_currency: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fee_minor?: number | null
          from_account_id?: string
          from_amount_minor?: number
          from_currency?: string
          id?: string
          ledger_id?: string
          note?: string | null
          occurred_at?: string
          to_account_id?: string
          to_amount_minor?: number
          to_currency?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'transfers_from_account_fkey'
            columns: [
              'ledger_id',
              'from_account_id',
              'from_currency',
            ]
            isOneToOne: false
            referencedRelation: 'account_balances'
            referencedColumns: [
              'ledger_id',
              'account_id',
              'currency',
            ]
          },
          {
            foreignKeyName: 'transfers_from_account_fkey'
            columns: [
              'ledger_id',
              'from_account_id',
              'from_currency',
            ]
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: [
              'ledger_id',
              'id',
              'currency',
            ]
          },
          {
            foreignKeyName: 'transfers_ledger_id_fkey'
            columns: [
              'ledger_id',
            ]
            isOneToOne: false
            referencedRelation: 'ledgers'
            referencedColumns: [
              'id',
            ]
          },
          {
            foreignKeyName: 'transfers_to_account_fkey'
            columns: [
              'ledger_id',
              'to_account_id',
              'to_currency',
            ]
            isOneToOne: false
            referencedRelation: 'account_balances'
            referencedColumns: [
              'ledger_id',
              'account_id',
              'currency',
            ]
          },
          {
            foreignKeyName: 'transfers_to_account_fkey'
            columns: [
              'ledger_id',
              'to_account_id',
              'to_currency',
            ]
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: [
              'ledger_id',
              'id',
              'currency',
            ]
          },
        ]
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
      account_balances: {
        Row: {
          account_id: string
          balance_minor: number | null
          currency: string
          ledger_id: string
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'accounts_ledger_id_fkey'
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
      obligation_states: {
        Row: {
          account_id: string | null
          category_id: string | null
          currency: string
          direction: string
          due_on: string
          ledger_id: string
          lifecycle: string
          obligation_id: string
          occurrence_on: string
          overpaid_minor: number | null
          paid_minor: number | null
          planned_amount_minor: number | null
          remaining_minor: number | null
          sequence_no: number | null
          settled_at: string | null
          settled_by: string | null
          source_id: string | null
          source_type: string
          state: string | null
          title: string
          version: number
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'obligations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
            ]
            isOneToOne: false
            referencedRelation: 'account_balances'
            referencedColumns: [
              'ledger_id',
              'account_id',
            ]
          },
          {
            foreignKeyName: 'obligations_account_fkey'
            columns: [
              'ledger_id',
              'account_id',
            ]
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'obligations_category_fkey'
            columns: [
              'ledger_id',
              'category_id',
            ]
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'obligations_ledger_id_fkey'
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
    }
    Functions: {
      accept_ledger_invite: {
        Args: {
          p_token: string
        }
        Returns: string
      }
      archive_category: {
        Args: {
          p_id: string
          p_move_to?: string
        }
        Returns: undefined
      }
      create_ledger: {
        Args: {
          p_base_currency?: string
          p_id: string
          p_name: string
        }
        Returns: {
          base_currency: string
          created_at: string
          created_by: string | null
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
        SetofOptions: {
          from: '*'
          to: 'ledgers'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_ledger_invite: {
        Args: {
          p_email: string
          p_id: string
          p_ledger_id: string
          p_role: string
          p_token_hash: string
        }
        Returns: {
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
        SetofOptions: {
          from: '*'
          to: 'ledger_invites'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_operation: {
        Args: {
          p_operation: Json
        }
        Returns: {
          account_id: string
          amount_minor: number
          base_amount_minor: number | null
          base_currency: string
          category_id: string | null
          category_kind: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          duplicated_from_id: string | null
          fx_rate: number | null
          fx_rate_on: string | null
          fx_source: string | null
          id: string
          kind: string
          ledger_id: string
          note: string | null
          occurred_at: string
          occurred_on: string
          refund_of_id: string | null
          transfer_id: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'operations'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_transfer: {
        Args: {
          p_transfer: Json
        }
        Returns: {
          created_at: string
          created_by: string | null
          fee_minor: number | null
          from_account_id: string
          from_amount_minor: number
          from_currency: string
          id: string
          ledger_id: string
          note: string | null
          occurred_at: string
          to_account_id: string
          to_amount_minor: number
          to_currency: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'transfers'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_obligation_payment: {
        Args: {
          p_delete_operation?: boolean
          p_payment_id: string
        }
        Returns: {
          account_id: string | null
          category_id: string | null
          currency: string
          direction: string
          due_on: string
          ledger_id: string
          lifecycle: string
          obligation_id: string
          occurrence_on: string
          overpaid_minor: number | null
          paid_minor: number | null
          planned_amount_minor: number | null
          remaining_minor: number | null
          sequence_no: number | null
          settled_at: string | null
          settled_by: string | null
          source_id: string | null
          source_type: string
          state: string | null
          title: string
          version: number
        }[]
        SetofOptions: {
          from: '*'
          to: 'obligation_states'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_operation: {
        Args: {
          p_expected_version: number
          p_id: string
        }
        Returns: undefined
      }
      pay_obligation: {
        Args: {
          p_amount_minor: number
          p_existing_operation_id?: string
          p_expected_version: number
          p_obligation_id: string
          p_operation?: Json
          p_payment_id: string
          p_settle?: boolean
        }
        Returns: {
          account_id: string | null
          category_id: string | null
          currency: string
          direction: string
          due_on: string
          ledger_id: string
          lifecycle: string
          obligation_id: string
          occurrence_on: string
          overpaid_minor: number | null
          paid_minor: number | null
          planned_amount_minor: number | null
          remaining_minor: number | null
          sequence_no: number | null
          settled_at: string | null
          settled_by: string | null
          source_id: string | null
          source_type: string
          state: string | null
          title: string
          version: number
        }[]
        SetofOptions: {
          from: '*'
          to: 'obligation_states'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      remove_member: {
        Args: {
          p_ledger_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_member_role: {
        Args: {
          p_ledger_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_operation: {
        Args: {
          p_expected_version: number
          p_id: string
          p_patch: Json
        }
        Returns: {
          account_id: string
          amount_minor: number
          base_amount_minor: number | null
          base_currency: string
          category_id: string | null
          category_kind: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          duplicated_from_id: string | null
          fx_rate: number | null
          fx_rate_on: string | null
          fx_source: string | null
          id: string
          kind: string
          ledger_id: string
          note: string | null
          occurred_at: string
          occurred_on: string
          refund_of_id: string | null
          transfer_id: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'operations'
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
