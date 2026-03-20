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
      attendance_records: {
        Row: {
          attended: boolean | null
          character_id: string | null
          character_name: string | null
          created_at: string | null
          excused: boolean | null
          id: string
          is_excused: boolean | null
          modified_by: string | null
          no_call_no_show: boolean | null
          notes: string | null
          points_override: number | null
          raid_event_id: string | null
          signed_up: boolean | null
          updated_at: string | null
          user_id: string | null
          was_benched: boolean | null
          was_late: boolean | null
        }
        Insert: {
          attended?: boolean | null
          character_id?: string | null
          character_name?: string | null
          created_at?: string | null
          excused?: boolean | null
          id?: string
          is_excused?: boolean | null
          modified_by?: string | null
          no_call_no_show?: boolean | null
          notes?: string | null
          points_override?: number | null
          raid_event_id?: string | null
          signed_up?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          was_benched?: boolean | null
          was_late?: boolean | null
        }
        Update: {
          attended?: boolean | null
          character_id?: string | null
          character_name?: string | null
          created_at?: string | null
          excused?: boolean | null
          id?: string
          is_excused?: boolean | null
          modified_by?: string | null
          no_call_no_show?: boolean | null
          notes?: string | null
          points_override?: number | null
          raid_event_id?: string | null
          signed_up?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          was_benched?: boolean | null
          was_late?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_raid_event_id_fkey"
            columns: ["raid_event_id"]
            isOneToOne: false
            referencedRelation: "raid_events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          guild_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          guild_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          guild_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      battlenet_accounts: {
        Row: {
          access_token: string
          battlenet_id: number
          battletag: string | null
          created_at: string | null
          id: string
          refresh_token: string | null
          region: string
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          battlenet_id: number
          battletag?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          region?: string
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          battlenet_id?: number
          battletag?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          region?: string
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blp_tracking: {
        Row: {
          character_id: string
          created_at: string
          expansion_id: string | null
          guild_id: string
          id: string
          last_updated_at: string
          loot_item_id: string
          times_passed: number
        }
        Insert: {
          character_id: string
          created_at?: string
          expansion_id?: string | null
          guild_id: string
          id?: string
          last_updated_at?: string
          loot_item_id: string
          times_passed?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          expansion_id?: string | null
          guild_id?: string
          id?: string
          last_updated_at?: string
          loot_item_id?: string
          times_passed?: number
        }
        Relationships: [
          {
            foreignKeyName: "blp_tracking_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blp_tracking_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blp_tracking_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blp_tracking_loot_item_id_fkey"
            columns: ["loot_item_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
        ]
      }
      character_aliases: {
        Row: {
          alias_name: string
          character_id: string
          created_at: string
          guild_id: string
          id: string
        }
        Insert: {
          alias_name: string
          character_id: string
          created_at?: string
          guild_id: string
          id?: string
        }
        Update: {
          alias_name?: string
          character_id?: string
          created_at?: string
          guild_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_aliases_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_aliases_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      character_equipped_items: {
        Row: {
          character_id: string
          enchant_id: number | null
          gem_ids: number[] | null
          id: string
          imported_at: string | null
          item_name: string | null
          slot: string
          wowhead_id: number
        }
        Insert: {
          character_id: string
          enchant_id?: number | null
          gem_ids?: number[] | null
          id?: string
          imported_at?: string | null
          item_name?: string | null
          slot: string
          wowhead_id: number
        }
        Update: {
          character_id?: string
          enchant_id?: number | null
          gem_ids?: number[] | null
          id?: string
          imported_at?: string | null
          item_name?: string | null
          slot?: string
          wowhead_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_equipped_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_guild_memberships: {
        Row: {
          character_id: string
          guild_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          joined_via: string | null
          membership_status: string | null
          promoted_at: string | null
          role: string | null
          trial_started_at: string | null
        }
        Insert: {
          character_id: string
          guild_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          joined_via?: string | null
          membership_status?: string | null
          promoted_at?: string | null
          role?: string | null
          trial_started_at?: string | null
        }
        Update: {
          character_id?: string
          guild_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          joined_via?: string | null
          membership_status?: string | null
          promoted_at?: string | null
          role?: string | null
          trial_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_guild_memberships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_guild_memberships_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          battle_net_id: number | null
          class_id: string | null
          created_at: string | null
          game_version: string | null
          guardian_conversion_dismissed: boolean | null
          id: string
          is_main: boolean | null
          level: number | null
          name: string
          realm: string | null
          region: string | null
          spec_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          battle_net_id?: number | null
          class_id?: string | null
          created_at?: string | null
          game_version?: string | null
          guardian_conversion_dismissed?: boolean | null
          id?: string
          is_main?: boolean | null
          level?: number | null
          name: string
          realm?: string | null
          region?: string | null
          spec_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          battle_net_id?: number | null
          class_id?: string | null
          created_at?: string | null
          game_version?: string | null
          guardian_conversion_dismissed?: boolean | null
          id?: string
          is_main?: boolean | null
          level?: number | null
          name?: string
          realm?: string | null
          region?: string | null
          spec_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "wow_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "class_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      class_specs: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_specs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "wow_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      expansions: {
        Row: {
          created_at: string | null
          current_phase: number | null
          fifth_raid_day: number | null
          first_raid_day: number | null
          fourth_raid_day: number | null
          guild_id: string | null
          id: string
          is_active: boolean | null
          name: string
          phase_deadlines: Json | null
          phase_groups: Json | null
          raid_days_per_week: number | null
          raid_start_date: string | null
          second_raid_day: number | null
          third_raid_day: number | null
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          current_phase?: number | null
          fifth_raid_day?: number | null
          first_raid_day?: number | null
          fourth_raid_day?: number | null
          guild_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phase_deadlines?: Json | null
          phase_groups?: Json | null
          raid_days_per_week?: number | null
          raid_start_date?: string | null
          second_raid_day?: number | null
          third_raid_day?: number | null
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          current_phase?: number | null
          fifth_raid_day?: number | null
          first_raid_day?: number | null
          fourth_raid_day?: number | null
          guild_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phase_deadlines?: Json | null
          phase_groups?: Json | null
          raid_days_per_week?: number | null
          raid_start_date?: string | null
          second_raid_day?: number | null
          third_raid_day?: number | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expansions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          current_uses: number | null
          expires_at: string | null
          guild_id: string
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          current_uses?: number | null
          expires_at?: string | null
          guild_id: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          current_uses?: number | null
          expires_at?: string | null
          guild_id?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_invite_codes_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_item_priorities: {
        Row: {
          character_priorities: Json | null
          class_priorities: Json | null
          created_at: string | null
          guild_id: string
          id: string
          item_id: string
          notes: string | null
          priority_bonuses: Json | null
          raid_tier_id: string
          role_priorities: Json | null
          updated_at: string | null
        }
        Insert: {
          character_priorities?: Json | null
          class_priorities?: Json | null
          created_at?: string | null
          guild_id: string
          id?: string
          item_id: string
          notes?: string | null
          priority_bonuses?: Json | null
          raid_tier_id: string
          role_priorities?: Json | null
          updated_at?: string | null
        }
        Update: {
          character_priorities?: Json | null
          class_priorities?: Json | null
          created_at?: string | null
          guild_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          priority_bonuses?: Json | null
          raid_tier_id?: string
          role_priorities?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_item_priorities_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_item_priorities_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_item_priorities_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          character_name: string | null
          class_id: string | null
          guild_id: string | null
          id: string
          invite_code_id: string | null
          is_active: boolean | null
          joined_at: string | null
          joined_via: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          character_name?: string | null
          class_id?: string | null
          guild_id?: string | null
          id?: string
          invite_code_id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          joined_via?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          character_name?: string | null
          class_id?: string | null
          guild_id?: string | null
          id?: string
          invite_code_id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          joined_via?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "wow_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "guild_invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_roles: {
        Row: {
          color_hex: string | null
          created_at: string | null
          guild_id: string
          id: string
          is_default: boolean | null
          name: string
          position: number
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          guild_id: string
          id?: string
          is_default?: boolean | null
          name: string
          position?: number
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          guild_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "guild_roles_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_settings: {
        Row: {
          attendance_type: string
          blp_enabled: boolean | null
          blp_increment: number | null
          blp_maximum: number | null
          bottom_attendance_bonus: number
          bottom_attendance_threshold: number
          class_bonus_priority_single_item: boolean | null
          created_at: string | null
          decimal_places: number | null
          donation_bonus_type: string | null
          donation_bonuses_enabled: boolean | null
          donation_cap_enabled: boolean | null
          enforce_slot_restrictions: boolean
          fifth_raid_day: number | null
          first_raid_day: number | null
          first_raid_week_date: string | null
          fourth_raid_day: number | null
          guild_id: string
          guild_rank_bonuses_enabled: boolean | null
          id: string
          late_early_penalty_enabled: boolean | null
          late_early_penalty_value: number | null
          max_attendance_bonus: number
          max_attendance_threshold: number
          middle_attendance_bonus: number
          middle_attendance_threshold: number
          minimum_raid_days: number | null
          minimum_raid_days_enabled: boolean | null
          new_member_mode: string | null
          new_members_start_as_trial: boolean | null
          number_of_ranks: number | null
          pass_item_bonus: boolean
          pass_item_bonus_value: number
          raid_days: string[] | null
          raid_days_per_week: number | null
          raid_roles_overall_bonus_priority: boolean | null
          raid_summary_channel_id: string | null
          rank_modifiers: Json
          reset_date: string | null
          role_bonus_priority_single_item: boolean | null
          role_modifiers: Json | null
          rolling_attendance_weeks: number
          second_raid_day: number | null
          see_item_bonus: boolean
          see_item_bonus_value: number
          signup_weight: number
          single_raider_bonus_single_item: boolean | null
          single_raider_overall_bonus: boolean | null
          third_raid_day: number | null
          trial_auto_promote_enabled: boolean | null
          trial_auto_promote_weeks: number | null
          trial_penalty_enabled: boolean | null
          trial_penalty_value: number | null
          updated_at: string | null
          use_signups: boolean
          wcl_guild_url: string | null
        }
        Insert: {
          attendance_type?: string
          blp_enabled?: boolean | null
          blp_increment?: number | null
          blp_maximum?: number | null
          bottom_attendance_bonus?: number
          bottom_attendance_threshold?: number
          class_bonus_priority_single_item?: boolean | null
          created_at?: string | null
          decimal_places?: number | null
          donation_bonus_type?: string | null
          donation_bonuses_enabled?: boolean | null
          donation_cap_enabled?: boolean | null
          enforce_slot_restrictions?: boolean
          fifth_raid_day?: number | null
          first_raid_day?: number | null
          first_raid_week_date?: string | null
          fourth_raid_day?: number | null
          guild_id: string
          guild_rank_bonuses_enabled?: boolean | null
          id?: string
          late_early_penalty_enabled?: boolean | null
          late_early_penalty_value?: number | null
          max_attendance_bonus?: number
          max_attendance_threshold?: number
          middle_attendance_bonus?: number
          middle_attendance_threshold?: number
          minimum_raid_days?: number | null
          minimum_raid_days_enabled?: boolean | null
          new_member_mode?: string | null
          new_members_start_as_trial?: boolean | null
          number_of_ranks?: number | null
          pass_item_bonus?: boolean
          pass_item_bonus_value?: number
          raid_days?: string[] | null
          raid_days_per_week?: number | null
          raid_roles_overall_bonus_priority?: boolean | null
          raid_summary_channel_id?: string | null
          rank_modifiers?: Json
          reset_date?: string | null
          role_bonus_priority_single_item?: boolean | null
          role_modifiers?: Json | null
          rolling_attendance_weeks?: number
          second_raid_day?: number | null
          see_item_bonus?: boolean
          see_item_bonus_value?: number
          signup_weight?: number
          single_raider_bonus_single_item?: boolean | null
          single_raider_overall_bonus?: boolean | null
          third_raid_day?: number | null
          trial_auto_promote_enabled?: boolean | null
          trial_auto_promote_weeks?: number | null
          trial_penalty_enabled?: boolean | null
          trial_penalty_value?: number | null
          updated_at?: string | null
          use_signups?: boolean
          wcl_guild_url?: string | null
        }
        Update: {
          attendance_type?: string
          blp_enabled?: boolean | null
          blp_increment?: number | null
          blp_maximum?: number | null
          bottom_attendance_bonus?: number
          bottom_attendance_threshold?: number
          class_bonus_priority_single_item?: boolean | null
          created_at?: string | null
          decimal_places?: number | null
          donation_bonus_type?: string | null
          donation_bonuses_enabled?: boolean | null
          donation_cap_enabled?: boolean | null
          enforce_slot_restrictions?: boolean
          fifth_raid_day?: number | null
          first_raid_day?: number | null
          first_raid_week_date?: string | null
          fourth_raid_day?: number | null
          guild_id?: string
          guild_rank_bonuses_enabled?: boolean | null
          id?: string
          late_early_penalty_enabled?: boolean | null
          late_early_penalty_value?: number | null
          max_attendance_bonus?: number
          max_attendance_threshold?: number
          middle_attendance_bonus?: number
          middle_attendance_threshold?: number
          minimum_raid_days?: number | null
          minimum_raid_days_enabled?: boolean | null
          new_member_mode?: string | null
          new_members_start_as_trial?: boolean | null
          number_of_ranks?: number | null
          pass_item_bonus?: boolean
          pass_item_bonus_value?: number
          raid_days?: string[] | null
          raid_days_per_week?: number | null
          raid_roles_overall_bonus_priority?: boolean | null
          raid_summary_channel_id?: string | null
          rank_modifiers?: Json
          reset_date?: string | null
          role_bonus_priority_single_item?: boolean | null
          role_modifiers?: Json | null
          rolling_attendance_weeks?: number
          second_raid_day?: number | null
          see_item_bonus?: boolean
          see_item_bonus_value?: number
          signup_weight?: number
          single_raider_bonus_single_item?: boolean | null
          single_raider_overall_bonus?: boolean | null
          third_raid_day?: number | null
          trial_auto_promote_enabled?: boolean | null
          trial_auto_promote_weeks?: number | null
          trial_penalty_enabled?: boolean | null
          trial_penalty_value?: number | null
          updated_at?: string | null
          use_signups?: boolean
          wcl_guild_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_settings_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: true
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          active_expansion_id: string | null
          created_at: string | null
          created_by: string | null
          discord_server_id: string | null
          faction: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          realm: string | null
          require_discord_verification: boolean | null
        }
        Insert: {
          active_expansion_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discord_server_id?: string | null
          faction?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          realm?: string | null
          require_discord_verification?: boolean | null
        }
        Update: {
          active_expansion_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discord_server_id?: string | null
          faction?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          realm?: string | null
          require_discord_verification?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "guilds_active_expansion_id_fkey"
            columns: ["active_expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_deadlines: {
        Row: {
          allow_late: boolean | null
          created_at: string | null
          created_by: string | null
          deadline_at: string
          guild_id: string | null
          id: string
          is_locked: boolean | null
          raid_tier_id: string | null
        }
        Insert: {
          allow_late?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline_at: string
          guild_id?: string | null
          id?: string
          is_locked?: boolean | null
          raid_tier_id?: string | null
        }
        Update: {
          allow_late?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline_at?: string
          guild_id?: string | null
          id?: string
          is_locked?: boolean | null
          raid_tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_deadlines_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_deadlines_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_history: {
        Row: {
          awarded_by: string | null
          awarded_date: string
          character_id: string | null
          character_name: string | null
          created_at: string | null
          expansion_id: string | null
          guild_id: string
          id: string
          loot_item_id: string
          notes: string | null
          raid_event_id: string | null
          raid_tier_id: string
          updated_at: string | null
        }
        Insert: {
          awarded_by?: string | null
          awarded_date?: string
          character_id?: string | null
          character_name?: string | null
          created_at?: string | null
          expansion_id?: string | null
          guild_id: string
          id?: string
          loot_item_id: string
          notes?: string | null
          raid_event_id?: string | null
          raid_tier_id: string
          updated_at?: string | null
        }
        Update: {
          awarded_by?: string | null
          awarded_date?: string
          character_id?: string | null
          character_name?: string | null
          created_at?: string | null
          expansion_id?: string | null
          guild_id?: string
          id?: string
          loot_item_id?: string
          notes?: string | null
          raid_event_id?: string | null
          raid_tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_history_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_history_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_history_loot_item_id_fkey"
            columns: ["loot_item_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_history_raid_event_id_fkey"
            columns: ["raid_event_id"]
            isOneToOne: false
            referencedRelation: "raid_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_history_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_item_classes: {
        Row: {
          class_id: string | null
          id: string
          loot_item_id: string | null
          spec_id: string | null
          spec_type: string | null
        }
        Insert: {
          class_id?: string | null
          id?: string
          loot_item_id?: string | null
          spec_id?: string | null
          spec_type?: string | null
        }
        Update: {
          class_id?: string | null
          id?: string
          loot_item_id?: string | null
          spec_id?: string | null
          spec_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_item_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "wow_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_item_classes_loot_item_id_fkey"
            columns: ["loot_item_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_item_classes_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "class_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_items: {
        Row: {
          allocation_cost: number | null
          armor_type: string | null
          boss_name: string | null
          classification: string | null
          created_at: string | null
          icon_url: string | null
          id: string
          is_available: boolean | null
          is_loot_council: boolean
          item_slot: string | null
          item_type: string | null
          name: string
          notes: string | null
          officer_notes: string | null
          raid_tier_id: string | null
          roles: string[] | null
          weapon_type: string | null
          wowhead_id: number | null
        }
        Insert: {
          allocation_cost?: number | null
          armor_type?: string | null
          boss_name?: string | null
          classification?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_available?: boolean | null
          is_loot_council?: boolean
          item_slot?: string | null
          item_type?: string | null
          name: string
          notes?: string | null
          officer_notes?: string | null
          raid_tier_id?: string | null
          roles?: string[] | null
          weapon_type?: string | null
          wowhead_id?: number | null
        }
        Update: {
          allocation_cost?: number | null
          armor_type?: string | null
          boss_name?: string | null
          classification?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_available?: boolean | null
          is_loot_council?: boolean
          item_slot?: string | null
          item_type?: string | null
          name?: string
          notes?: string | null
          officer_notes?: string | null
          raid_tier_id?: string | null
          roles?: string[] | null
          weapon_type?: string | null
          wowhead_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_items_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_submission_items: {
        Row: {
          id: string
          loot_item_id: string | null
          rank: number
          removed_at: string | null
          removed_by: string | null
          slot: number
          submission_id: string | null
        }
        Insert: {
          id?: string
          loot_item_id?: string | null
          rank: number
          removed_at?: string | null
          removed_by?: string | null
          slot?: number
          submission_id?: string | null
        }
        Update: {
          id?: string
          loot_item_id?: string | null
          rank?: number
          removed_at?: string | null
          removed_by?: string | null
          slot?: number
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_submission_items_loot_item_id_fkey"
            columns: ["loot_item_id"]
            isOneToOne: false
            referencedRelation: "loot_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "loot_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_submission_snapshots: {
        Row: {
          id: string
          items: Json
          snapshot_at: string
          submission_id: string
          version: number
        }
        Insert: {
          id?: string
          items: Json
          snapshot_at?: string
          submission_id: string
          version: number
        }
        Update: {
          id?: string
          items?: Json
          snapshot_at?: string
          submission_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "loot_submission_snapshots_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "loot_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      loot_submissions: {
        Row: {
          character_id: string | null
          created_at: string | null
          expansion_id: string | null
          guild_id: string | null
          id: string
          is_late: boolean | null
          phase: number | null
          raid_tier_id: string | null
          resubmission_count: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          expansion_id?: string | null
          guild_id?: string | null
          id?: string
          is_late?: boolean | null
          phase?: number | null
          raid_tier_id?: string | null
          resubmission_count?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          expansion_id?: string | null
          guild_id?: string | null
          id?: string
          is_late?: boolean | null
          phase?: number | null
          raid_tier_id?: string | null
          resubmission_count?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loot_submissions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_submissions_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_submissions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loot_submissions_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      raid_events: {
        Row: {
          created_at: string | null
          guild_id: string | null
          id: string
          is_skipped: boolean | null
          notes: string | null
          raid_date: string
          raid_tier_id: string | null
          skip_reason: string | null
          wcl_report_code: string | null
        }
        Insert: {
          created_at?: string | null
          guild_id?: string | null
          id?: string
          is_skipped?: boolean | null
          notes?: string | null
          raid_date: string
          raid_tier_id?: string | null
          skip_reason?: string | null
          wcl_report_code?: string | null
        }
        Update: {
          created_at?: string | null
          guild_id?: string | null
          id?: string
          is_skipped?: boolean | null
          notes?: string | null
          raid_date?: string
          raid_tier_id?: string | null
          skip_reason?: string | null
          wcl_report_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raid_events_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_events_raid_tier_id_fkey"
            columns: ["raid_tier_id"]
            isOneToOne: false
            referencedRelation: "raid_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_tiers: {
        Row: {
          expansion_id: string | null
          id: string
          is_active: boolean | null
          is_guild_active: boolean
          master_sheet_visible: boolean | null
          name: string
          phase: number | null
          sort_order: number | null
          submission_deadline: string | null
        }
        Insert: {
          expansion_id?: string | null
          id?: string
          is_active?: boolean | null
          is_guild_active?: boolean
          master_sheet_visible?: boolean | null
          name: string
          phase?: number | null
          sort_order?: number | null
          submission_deadline?: string | null
        }
        Update: {
          expansion_id?: string | null
          id?: string
          is_active?: boolean | null
          is_guild_active?: boolean
          master_sheet_visible?: boolean | null
          name?: string
          phase?: number | null
          sort_order?: number | null
          submission_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raid_tiers_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_characters: {
        Row: {
          active_character_id: string | null
          active_guild_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_character_id?: string | null
          active_guild_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_character_id?: string | null
          active_guild_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_characters_active_character_id_fkey"
            columns: ["active_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_characters_active_guild_id_fkey"
            columns: ["active_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_guilds: {
        Row: {
          active_guild_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_guild_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_guild_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_guilds_active_guild_id_fkey"
            columns: ["active_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accent_color: string | null
          bio: string | null
          created_at: string | null
          discord_guild_member: boolean | null
          discord_id: string | null
          discord_verified: boolean | null
          id: string
          last_verified_at: string | null
          notify_loot_deadline: boolean | null
          notify_new_raids: boolean | null
          notify_submission_status: boolean | null
          preferred_display_name: string | null
          show_attendance_stats: boolean | null
          show_discord_username: boolean | null
          show_email: boolean | null
          show_loot_history: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          bio?: string | null
          created_at?: string | null
          discord_guild_member?: boolean | null
          discord_id?: string | null
          discord_verified?: boolean | null
          id?: string
          last_verified_at?: string | null
          notify_loot_deadline?: boolean | null
          notify_new_raids?: boolean | null
          notify_submission_status?: boolean | null
          preferred_display_name?: string | null
          show_attendance_stats?: boolean | null
          show_discord_username?: boolean | null
          show_email?: boolean | null
          show_loot_history?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          bio?: string | null
          created_at?: string | null
          discord_guild_member?: boolean | null
          discord_id?: string | null
          discord_verified?: boolean | null
          id?: string
          last_verified_at?: string | null
          notify_loot_deadline?: boolean | null
          notify_new_raids?: boolean | null
          notify_submission_status?: boolean | null
          preferred_display_name?: string | null
          show_attendance_stats?: boolean | null
          show_discord_username?: boolean | null
          show_email?: boolean | null
          show_loot_history?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wow_classes: {
        Row: {
          color_hex: string | null
          id: string
          name: string
        }
        Insert: {
          color_hex?: string | null
          id?: string
          name: string
        }
        Update: {
          color_hex?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_master_sheet: {
        Args: { p_raid_tier_id: string; p_user_id: string }
        Returns: boolean
      }
      character_belongs_to_user: {
        Args: { p_character_id: string }
        Returns: boolean
      }
      character_has_submission_to_user_guilds: {
        Args: { p_character_id: string }
        Returns: boolean
      }
      create_expansion_for_guild: {
        Args: { p_guild_id: string; p_name: string }
        Returns: string
      }
      delete_guild: { Args: { p_guild_id: string }; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      get_character_guilds: {
        Args: { p_character_id: string }
        Returns: {
          guild_icon_url: string
          guild_id: string
          guild_name: string
          joined_at: string
          membership_role: string
        }[]
      }
      get_current_user_guild_ids: { Args: never; Returns: string[] }
      get_guild_current_expansion: {
        Args: { p_guild_id: string }
        Returns: string
      }
      get_guild_expansions: {
        Args: { p_guild_id: string }
        Returns: {
          created_at: string
          expansion_id: string
          expansion_name: string
          fifth_raid_day: number
          first_raid_day: number
          fourth_raid_day: number
          is_current: boolean
          raid_days_per_week: number
          raid_start_date: string
          second_raid_day: number
          third_raid_day: number
          timezone: string
        }[]
      }
      get_guild_submissions: {
        Args: { p_guild_id: string; p_raid_tier_id: string }
        Returns: {
          character_class_color: string
          character_class_name: string
          character_id: string
          character_name: string
          id: string
          item_count: number
          review_notes: string
          status: string
          submitted_at: string
          user_id: string
        }[]
      }
      get_user_characters_in_guild: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: {
          character_id: string
          character_is_main: boolean
          character_level: number
          character_name: string
          character_realm: string
          class_color: string
          class_name: string
          membership_role: string
        }[]
      }
      get_user_guild_ids: {
        Args: { p_user_id: string }
        Returns: {
          guild_id: string
        }[]
      }
      increment_blp: {
        Args: {
          p_character_id: string
          p_guild_id: string
          p_loot_item_id: string
        }
        Returns: number
      }
      is_invite_code_valid: { Args: { code_input: string }; Returns: boolean }
      is_officer_of_guild: {
        Args: { guild_id_to_check: string; user_id_to_check: string }
        Returns: boolean
      }
      is_past_deadline: { Args: { p_raid_tier_id: string }; Returns: boolean }
      merge_phase_groups: {
        Args: {
          p_expansion_id: string
          p_guild_id: string
          p_merged_groups: Json
          p_phase_groups: Json
        }
        Returns: Json
      }
      redeem_invite_code: {
        Args: { code_input: string }
        Returns: {
          error_code: string
          invite_code_id: string
          invite_current_uses: number
          invite_expires_at: string
          invite_guild_id: string
          invite_is_active: boolean
          invite_max_uses: number
        }[]
      }
      reset_blp: {
        Args: {
          p_character_id: string
          p_guild_id: string
          p_loot_item_id: string
        }
        Returns: undefined
      }
      save_submission_items: {
        Args: { p_items: Json; p_submission_id: string }
        Returns: number
      }
      seed_tbc_expansion: { Args: { p_guild_id: string }; Returns: undefined }
      seed_tbc_expansion_for_guild: {
        Args: { p_guild_id: string }
        Returns: undefined
      }
      set_guild_active_expansion: {
        Args: { p_expansion_id: string; p_guild_id: string }
        Returns: undefined
      }
      update_guild_icon: {
        Args: { p_guild_id: string; p_icon_url: string }
        Returns: undefined
      }
      update_guild_info: {
        Args: {
          p_discord_server_id: string
          p_faction: string
          p_guild_id: string
          p_name: string
          p_realm: string
        }
        Returns: undefined
      }
      user_is_in_guild: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_officer_in_guild: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
