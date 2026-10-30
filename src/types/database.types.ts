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
      budget_limits: {
        Row: {
          budget_month_id: string
          carried_in_minor: number | null
          carry_mode: string
          category_id: string
          category_kind: string | null
          created_at: string
          created_by: string | null
          id: string
          ledger_id: string
          limit_minor: number
          updated_at: string
          version: number
          warn_at_pct: number | null
        }
        ComputedFields: never
        Insert: {
          budget_month_id: string
          carried_in_minor?: number | null
          carry_mode?: string
          category_id: string
          category_kind?: never
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id: string
          limit_minor: number
          updated_at?: string
          version?: number
          warn_at_pct?: number | null
        }
        Update: {
          budget_month_id?: string
          carried_in_minor?: number | null
          carry_mode?: string
          category_id?: string
          category_kind?: never
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id?: string
          limit_minor?: number
          updated_at?: string
          version?: number
          warn_at_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'budget_limits_category_fkey'
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
            foreignKeyName: 'budget_limits_ledger_id_fkey'
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
            foreignKeyName: 'budget_limits_month_fkey'
            columns: [
              'ledger_id',
              'budget_month_id',
            ]
            isOneToOne: false
            referencedRelation: 'budget_months'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
        ]
      }
      budget_months: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          income_plan_minor: number | null
          ledger_id: string
          month: string
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          income_plan_minor?: number | null
          ledger_id: string
          month: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          income_plan_minor?: number | null
          ledger_id?: string
          month?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'budget_months_ledger_id_fkey'
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
      calendar_saved_filters: {
        Row: {
          created_at: string
          created_by: string | null
          filter: NonNullable<Json>
          id: string
          ledger_id: string
          name: string
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          filter?: NonNullable<Json>
          id?: string
          ledger_id: string
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filter?: NonNullable<Json>
          id?: string
          ledger_id?: string
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_saved_filters_ledger_id_fkey'
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
          depth: number | null
          icon: string | null
          id: string
          kind: string
          ledger_id: string
          name: string
          parent_depth: number | null
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
          depth?: never
          icon?: string | null
          id?: string
          kind: string
          ledger_id: string
          name: string
          parent_depth?: never
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
          depth?: never
          icon?: string | null
          id?: string
          kind?: string
          ledger_id?: string
          name?: string
          parent_depth?: never
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
              'parent_depth',
            ]
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: [
              'ledger_id',
              'id',
              'kind',
              'depth',
            ]
          },
        ]
      }
      credits: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          fees_note: string | null
          id: string
          installments_count: number
          last_installment_minor: number | null
          ledger_id: string
          lender: string | null
          name: string
          note: string | null
          opened_on: string | null
          paid_before_tracking_count: number
          paid_before_tracking_minor: number | null
          purchase_price_minor: number | null
          regular_installment_minor: number | null
          schedule_accuracy: string
          status: string
          total_payable_minor: number | null
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          fees_note?: string | null
          id?: string
          installments_count: number
          last_installment_minor?: number | null
          ledger_id: string
          lender?: string | null
          name: string
          note?: string | null
          opened_on?: string | null
          paid_before_tracking_count?: number
          paid_before_tracking_minor?: number | null
          purchase_price_minor?: number | null
          regular_installment_minor?: number | null
          schedule_accuracy?: string
          status?: string
          total_payable_minor?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fees_note?: string | null
          id?: string
          installments_count?: number
          last_installment_minor?: number | null
          ledger_id?: string
          lender?: string | null
          name?: string
          note?: string | null
          opened_on?: string | null
          paid_before_tracking_count?: number
          paid_before_tracking_minor?: number | null
          purchase_price_minor?: number | null
          regular_installment_minor?: number | null
          schedule_accuracy?: string
          status?: string
          total_payable_minor?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'credits_account_fkey'
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
            foreignKeyName: 'credits_account_fkey'
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
            foreignKeyName: 'credits_ledger_id_fkey'
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
      debt_movements: {
        Row: {
          amount_minor: number
          created_at: string
          created_by: string | null
          debt_id: string
          id: string
          kind: string
          ledger_id: string
          occurred_on: string
          operation_id: string | null
        }
        ComputedFields: never
        Insert: {
          amount_minor: number
          created_at?: string
          created_by?: string | null
          debt_id: string
          id?: string
          kind: string
          ledger_id: string
          occurred_on: string
          operation_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          created_by?: string | null
          debt_id?: string
          id?: string
          kind?: string
          ledger_id?: string
          occurred_on?: string
          operation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'debt_movements_debt_fkey'
            columns: [
              'ledger_id',
              'debt_id',
            ]
            isOneToOne: false
            referencedRelation: 'debts'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
          {
            foreignKeyName: 'debt_movements_ledger_id_fkey'
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
            foreignKeyName: 'debt_movements_operation_fkey'
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
      debts: {
        Row: {
          account_id: string | null
          arisen_on: string
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          due_on: string | null
          id: string
          ledger_id: string
          note: string | null
          origin: string
          person: string
          principal_minor: number
          reason: string | null
          share_of_operation_id: string | null
          status: string
          updated_at: string
          version: number
        }
        ComputedFields: never
        Insert: {
          account_id?: string | null
          arisen_on: string
          created_at?: string
          created_by?: string | null
          currency: string
          direction: string
          due_on?: string | null
          id?: string
          ledger_id: string
          note?: string | null
          origin?: string
          person: string
          principal_minor: number
          reason?: string | null
          share_of_operation_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string | null
          arisen_on?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          due_on?: string | null
          id?: string
          ledger_id?: string
          note?: string | null
          origin?: string
          person?: string
          principal_minor?: number
          reason?: string | null
          share_of_operation_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'debts_account_fkey'
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
            foreignKeyName: 'debts_account_fkey'
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
            foreignKeyName: 'debts_ledger_id_fkey'
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
            foreignKeyName: 'debts_share_of_operation_fkey'
            columns: [
              'ledger_id',
              'share_of_operation_id',
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
          operation_amount_minor: number
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
          operation_amount_minor: number
          operation_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ledger_id?: string
          obligation_id?: string
          operation_amount_minor?: number
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
          category_kind: string | null
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
          category_kind?: never
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
          category_kind?: never
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
      subscription_prices: {
        Row: {
          amount_minor: number | null
          created_at: string
          created_by: string | null
          currency: string
          effective_on: string
          id: string
          ledger_id: string
          subscription_id: string
        }
        ComputedFields: never
        Insert: {
          amount_minor?: number | null
          created_at?: string
          created_by?: string | null
          currency: string
          effective_on: string
          id?: string
          ledger_id: string
          subscription_id: string
        }
        Update: {
          amount_minor?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_on?: string
          id?: string
          ledger_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_prices_ledger_id_fkey'
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
            foreignKeyName: 'subscription_prices_subscription_fkey'
            columns: [
              'ledger_id',
              'subscription_id',
            ]
            isOneToOne: false
            referencedRelation: 'subscriptions'
            referencedColumns: [
              'ledger_id',
              'id',
            ]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_ends_on: string | null
          account_id: string | null
          archived_at: string | null
          auto_renew_info: boolean | null
          cancelled_on: string | null
          category_id: string | null
          category_kind: string | null
          created_at: string
          created_by: string | null
          currency: string
          first_on: string
          id: string
          interval_count: number
          interval_unit: string
          ledger_id: string
          logo_key: string | null
          name: string
          note: string | null
          service_url: string | null
          short_month_rule: string
          status: string
          trial_ends_on: string | null
          updated_at: string
          verdict: string | null
          version: number
        }
        ComputedFields: never
        Insert: {
          access_ends_on?: string | null
          account_id?: string | null
          archived_at?: string | null
          auto_renew_info?: boolean | null
          cancelled_on?: string | null
          category_id?: string | null
          category_kind?: never
          created_at?: string
          created_by?: string | null
          currency: string
          first_on: string
          id?: string
          interval_count?: number
          interval_unit?: string
          ledger_id: string
          logo_key?: string | null
          name: string
          note?: string | null
          service_url?: string | null
          short_month_rule?: string
          status?: string
          trial_ends_on?: string | null
          updated_at?: string
          verdict?: string | null
          version?: number
        }
        Update: {
          access_ends_on?: string | null
          account_id?: string | null
          archived_at?: string | null
          auto_renew_info?: boolean | null
          cancelled_on?: string | null
          category_id?: string | null
          category_kind?: never
          created_at?: string
          created_by?: string | null
          currency?: string
          first_on?: string
          id?: string
          interval_count?: number
          interval_unit?: string
          ledger_id?: string
          logo_key?: string | null
          name?: string
          note?: string | null
          service_url?: string | null
          short_month_rule?: string
          status?: string
          trial_ends_on?: string | null
          updated_at?: string
          verdict?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_account_fkey'
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
            foreignKeyName: 'subscriptions_account_fkey'
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
            foreignKeyName: 'subscriptions_category_fkey'
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
            foreignKeyName: 'subscriptions_ledger_id_fkey'
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
      add_debt_movement: {
        Args: {
          p_movement: Json
          p_operation?: Json
        }
        Returns: {
          amount_minor: number
          created_at: string
          created_by: string | null
          debt_id: string
          id: string
          kind: string
          ledger_id: string
          occurred_on: string
          operation_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'debt_movements'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_category: {
        Args: {
          p_id: string
          p_move_to?: string
        }
        Returns: undefined
      }
      budget_month_facts: {
        Args: {
          p_created_by?: string
          p_ledger_id: string
          p_month: string
        }
        Returns: {
          carried_in_minor: number
          carry_mode: string
          category_id: string
          category_kind: string
          fact_minor: number
          gross_minor: number
          limit_id: string
          limit_minor: number
          operations_count: number
          refund_minor: number
          remaining_minor: number
          unknown_count: number
          warn_at_pct: number
        }[]
      }
      calendar_day_totals: {
        Args: {
          p_filter?: Json
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          day: string
          entries_count: number
          fact_expense_minor: number
          fact_income_minor: number
          plan_in_minor: number
          plan_out_minor: number
          unknown_count: number
        }[]
      }
      calendar_entries: {
        Args: {
          p_filter?: Json
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          account_id: string
          amount_minor: number
          base_amount_minor: number
          category_id: string
          currency: string
          day: string
          direction: string
          entry: string
          entry_id: string
          kind: string
          note: string
          obligation_id: string
          operation_id: string
          paid_minor: number
          planned_amount_minor: number
          planned_on: string
          source_id: string
          source_type: string
          state: string
          title: string
          transfer_id: string
        }[]
      }
      copy_budget_month: {
        Args: {
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: number
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
      list_orphan_attachments: {
        Args: Record<PropertyKey, never>
        Returns: string[]
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
      replace_credit_schedule: {
        Args: {
          p_credit_id: string
          p_expected_version: number
          p_installments: Json
        }
        Returns: {
          account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          fees_note: string | null
          id: string
          installments_count: number
          last_installment_minor: number | null
          ledger_id: string
          lender: string | null
          name: string
          note: string | null
          opened_on: string | null
          paid_before_tracking_count: number
          paid_before_tracking_minor: number | null
          purchase_price_minor: number | null
          regular_installment_minor: number | null
          schedule_accuracy: string
          status: string
          total_payable_minor: number | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'credits'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_credit: {
        Args: {
          p_credit: Json
          p_installments?: Json
        }
        Returns: {
          account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          fees_note: string | null
          id: string
          installments_count: number
          last_installment_minor: number | null
          ledger_id: string
          lender: string | null
          name: string
          note: string | null
          opened_on: string | null
          paid_before_tracking_count: number
          paid_before_tracking_minor: number | null
          purchase_price_minor: number | null
          regular_installment_minor: number | null
          schedule_accuracy: string
          status: string
          total_payable_minor: number | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'credits'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_debt: {
        Args: {
          p_debt: Json
          p_operation?: Json
        }
        Returns: {
          account_id: string | null
          arisen_on: string
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          due_on: string | null
          id: string
          ledger_id: string
          note: string | null
          origin: string
          person: string
          principal_minor: number
          reason: string | null
          share_of_operation_id: string | null
          status: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: '*'
          to: 'debts'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_entities: {
        Args: {
          p_ledger_id: string
          p_limit?: number
          p_q: string
        }
        Returns: {
          amount_minor: number
          currency: string
          day: string
          entity_id: string
          entity_type: string
          link_path: string
          subtitle: string
          title: string
        }[]
      }
      set_member_role: {
        Args: {
          p_ledger_id: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_my_display_name: {
        Args: {
          p_ledger_id: string
          p_name: string
        }
        Returns: undefined
      }
      set_subscription_price: {
        Args: {
          p_price: Json
        }
        Returns: {
          amount_minor: number | null
          created_at: string
          created_by: string | null
          currency: string
          effective_on: string
          id: string
          ledger_id: string
          subscription_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'subscription_prices'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stats_budget: {
        Args: {
          p_created_by?: string
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          carried_in_minor: number
          expense_fact_minor: number
          income_fact_minor: number
          income_plan_minor: number
          limit_minor: number
          limited_fact_minor: number
          month: string
          unknown_count: number
        }[]
      }
      stats_by_category: {
        Args: {
          p_created_by?: string
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          category_id: string
          category_kind: string
          fact_minor: number
          gross_minor: number
          operations_count: number
          refund_minor: number
          unknown_count: number
        }[]
      }
      stats_cashflow: {
        Args: {
          p_bucket?: string
          p_created_by?: string
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          expense_minor: number
          income_minor: number
          operations_count: number
          period_start: string
          refund_minor: number
          result_minor: number
          unknown_count: number
        }[]
      }
      stats_credits: {
        Args: {
          p_created_by?: string
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          credit_id: string
          currency: string
          installments_count: number
          lender: string
          name: string
          next_due_on: string
          paid_count: number
          payoff_on: string
          period_paid_count: number
          period_paid_minor: number
          remaining_base_minor: number
          remaining_count: number
          remaining_minor: number
          status: string
          unknown_count: number
        }[]
      }
      stats_subscriptions: {
        Args: {
          p_created_by?: string
          p_from: string
          p_ledger_id: string
          p_to: string
        }
        Returns: {
          avg_month_minor: number
          fact_count: number
          fact_minor: number
          months: number
          name: string
          plan_count: number
          plan_minor: number
          status: string
          subscription_id: string
          unknown_count: number
        }[]
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
      upsert_series_obligations: {
        Args: {
          p_from?: string
          p_rows: Json
          p_source_id: string
          p_source_type: string
        }
        Returns: number
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
