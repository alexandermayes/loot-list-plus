---@class LootListPlus
local LLP = select(2, ...)

-- Lua port of domain/scoring/ (web engine)
-- Must produce identical results to the web app

LLP.ScoreEngine = {}
local SE = LLP.ScoreEngine

local DB = LLP.DB

----------------------------------------------------------------------
-- calculateLootScore: master formula combining all components
----------------------------------------------------------------------
function SE:CalculateLootScore(itemRank, attendanceScore, rankModifier, badLuckBonus, priorityBonus, trialPenalty, roleBonus)
    return (itemRank or 0)
         + (attendanceScore or 0)
         + (rankModifier or 0)
         + (badLuckBonus or 0)
         + (priorityBonus or 0)
         + (trialPenalty or 0)
         + (roleBonus or 0)
end

----------------------------------------------------------------------
-- calculateAttendanceScore: 3 models, mirrors domain/scoring/attendance-score.ts
--
-- Record fields:
--   signed_up, attended, no_call_no_show (required)
--   was_late, was_benched, is_excused, points_override (optional)
--
-- Behavior:
--   NCNS: excluded from numerator (still in denominator)
--   Excused: excluded from both numerator and denominator
--   Benched: counts as attended (full credit)
--   Late + penalty enabled: reduced attendance points
--   points_override: replaces computed points for that record
--
-- NOTE: rolling-window / reset-week filtering is done server-side in
-- app/api/addon/{guild-data,export-string}/route.ts before the payload
-- ships. The records/totalRaids passed here already exclude the
-- in-progress reset week. Do not add windowing logic in Lua.
----------------------------------------------------------------------
function SE:CalculateAttendanceScore(records, totalRaids, settings)
    if not settings then settings = {} end

    local config = self:MergeDefaults(settings)

    if not records or #records == 0 or totalRaids == 0 then
        return 0
    end

    local latePenaltyEnabled = config.late_early_penalty_enabled
    local latePenaltyValue = config.late_early_penalty_value or 0

    -- Count attended raids (benched counts as attended)
    -- Excused excluded from both numerator and denominator
    -- Late attended raids (not benched) tracked separately so linear and
    -- breakpoint modes can subtract the per-raid penalty from the numerator.
    local attendedCount = 0
    local signedUpCount = 0
    local excusedCount = 0
    local lateCount = 0

    for _, r in ipairs(records) do
        if r.is_excused then
            excusedCount = excusedCount + 1
        elseif not r.no_call_no_show then
            if r.attended or r.was_benched then
                attendedCount = attendedCount + 1
            end
            if r.signed_up then
                signedUpCount = signedUpCount + 1
            end
            if r.attended and not r.was_benched and r.was_late and latePenaltyEnabled then
                lateCount = lateCount + 1
            end
        end
    end

    local effectiveTotal = totalRaids - excusedCount
    if effectiveTotal <= 0 then return 0 end

    local adjustedAttended = math.max(0, attendedCount - lateCount * latePenaltyValue)
    local attendancePercentage = adjustedAttended / effectiveTotal

    if config.attendance_type == "points-per-raid" then
        local attendancePointsPerRaid = 1 - config.signup_weight
        local signupPointsPerRaid = config.signup_weight

        local totalScore = 0
        for _, r in ipairs(records) do
            if r.no_call_no_show or r.is_excused then
                -- Skip: NCNS and excused don't contribute points
            elseif r.points_override ~= nil then
                -- Officer override: use exact value
                totalScore = totalScore + math.min(r.points_override, 1.0)
            else
                local raidPoints = 0
                if r.signed_up then
                    raidPoints = raidPoints + signupPointsPerRaid
                end
                if r.was_benched then
                    -- Benched = full attendance credit
                    raidPoints = raidPoints + attendancePointsPerRaid
                elseif r.attended then
                    local attendPoints = attendancePointsPerRaid
                    if r.was_late and latePenaltyEnabled then
                        attendPoints = math.max(0, attendPoints - latePenaltyValue)
                    end
                    raidPoints = raidPoints + attendPoints
                end
                totalScore = totalScore + math.min(raidPoints, 1.0)
            end
        end

        return math.min(totalScore, config.max_attendance_bonus)

    elseif config.attendance_type == "linear" then
        local baseScore = attendancePercentage * config.max_attendance_bonus

        if config.use_signups then
            local signupPercentage = signedUpCount / effectiveTotal
            local signupBonus = signupPercentage * config.max_attendance_bonus * config.signup_weight
            return math.min(baseScore + signupBonus, config.max_attendance_bonus)
        end

        return math.min(baseScore, config.max_attendance_bonus)

    else
        -- Breakpoint system
        if attendancePercentage >= config.max_attendance_threshold then
            return config.max_attendance_bonus
        elseif attendancePercentage >= config.middle_attendance_threshold then
            return config.middle_attendance_bonus
        elseif attendancePercentage >= config.bottom_attendance_threshold then
            return config.bottom_attendance_bonus
        end
        return 0
    end
end

----------------------------------------------------------------------
-- getRankModifier
----------------------------------------------------------------------
function SE:GetRankModifier(role, settings)
    if not settings then settings = {} end
    local config = self:MergeDefaults(settings)

    if not config.guild_rank_bonuses_enabled then
        return 0
    end

    if not role or not config.rank_modifiers then return 0 end
    return config.rank_modifiers[role] or 0
end

----------------------------------------------------------------------
-- getRaidRoleModifier
----------------------------------------------------------------------
-- Accepts a single role string or a table of roles (for dual-role specs).
-- Returns the highest bonus across all matching roles.
function SE:GetRaidRoleModifier(roles, settings)
    if not settings then settings = {} end
    local config = self:MergeDefaults(settings)

    if not config.raid_roles_overall_bonus_priority then
        return 0
    end

    if not roles or not config.role_modifiers then return 0 end

    -- Handle single string
    if type(roles) == "string" then
        return config.role_modifiers[roles] or 0
    end

    -- Handle table of roles: pick the best bonus
    local best = 0
    for _, role in ipairs(roles) do
        local val = config.role_modifiers[role] or 0
        if val > best or (best == 0 and val ~= 0) then
            best = val
        end
    end
    return best
end

----------------------------------------------------------------------
-- getTrialPenalty
----------------------------------------------------------------------
function SE:GetTrialPenalty(membershipStatus, settings)
    if not settings then settings = {} end
    local config = self:MergeDefaults(settings)

    if not config.trial_penalty_enabled or membershipStatus ~= "trial" then
        return 0
    end

    return config.trial_penalty_value
end

----------------------------------------------------------------------
-- calculateBadLuckBonus
----------------------------------------------------------------------
function SE:CalculateBadLuckBonus(timesPassed, settings)
    if not settings then settings = {} end
    local config = self:MergeDefaults(settings)

    if not config.blp_enabled or not timesPassed or timesPassed <= 0 then
        return 0
    end

    local bonus = timesPassed * config.blp_increment
    return math.min(bonus, config.blp_maximum)
end

----------------------------------------------------------------------
-- calculatePriorityBonus
----------------------------------------------------------------------
function SE:CalculatePriorityBonus(priority, characterId, specId, role)
    if not priority then return 0 end

    local bonus = 0

    -- Role priority (direct point value)
    if role and priority.role_priorities and priority.role_priorities[role] ~= nil then
        local rolePriority = tonumber(priority.role_priorities[role])
        if rolePriority then
            bonus = bonus + rolePriority
        end
    end

    -- Class/spec priority (direct point value)
    if specId and priority.class_priorities and priority.class_priorities[specId] ~= nil then
        local classPriority = tonumber(priority.class_priorities[specId])
        if classPriority then
            bonus = bonus + classPriority
        end
    end

    -- Individual character priority (direct point value)
    if characterId and priority.character_priorities and priority.character_priorities[characterId] ~= nil then
        local charPriority = tonumber(priority.character_priorities[characterId])
        if charPriority then
            bonus = bonus + charPriority
        end
    end

    return bonus
end

----------------------------------------------------------------------
-- Calculate full score for a character on a specific item
-- This is the main entry point used by LootDistribution
----------------------------------------------------------------------
function SE:CalculateCharacterItemScore(characterId, wowheadId, lootItemId)
    local settings = DB:GetSettings()
    local members = DB:GetMembers()
    local member = members[characterId]
    if not member then return nil end

    -- Get item rank from the member's submission
    local rank = member.items and member.items[tostring(wowheadId)]
    if not rank then return nil end

    -- Calculate each component
    local attendanceData = DB:GetAttendance()[characterId]
    local attendanceScore = 0
    if attendanceData then
        attendanceScore = self:CalculateAttendanceScore(
            attendanceData.records,
            attendanceData.totalRaids,
            settings
        )
    end

    local rankModifier = self:GetRankModifier(member.guildRole, settings)

    local blpCount = DB:GetBLPCount(characterId, lootItemId)
    local badLuckBonus = self:CalculateBadLuckBonus(blpCount, settings)

    local priorities = DB:GetPriorities()
    local itemPriority = priorities[lootItemId]
    local priorityBonus = self:CalculatePriorityBonus(
        itemPriority, characterId, member.specId, member.role
    )

    local trialPenalty = self:GetTrialPenalty(member.membershipStatus, settings)

    local roleBonus = self:GetRaidRoleModifier(member.role, settings)

    local totalScore = self:CalculateLootScore(
        rank, attendanceScore, rankModifier, badLuckBonus, priorityBonus, trialPenalty, roleBonus
    )

    return {
        score = totalScore,
        rank = rank,
        attendanceScore = attendanceScore,
        rankModifier = rankModifier,
        roleBonus = roleBonus,
        badLuckBonus = badLuckBonus,
        priorityBonus = priorityBonus,
        trialPenalty = trialPenalty,
        characterId = characterId,
        characterName = member.name,
        characterClass = member.class,
        classColor = member.classColor,
        specName = member.spec,
        guildRole = member.guildRole,
        membershipStatus = member.membershipStatus,
    }
end

----------------------------------------------------------------------
-- Get sorted priority list for an item (all characters who ranked it)
----------------------------------------------------------------------
function SE:GetItemPriorityList(wowheadId, lootItemId)
    local members = DB:GetMembers()
    local results = {}

    for characterId, member in pairs(members) do
        local score = self:CalculateCharacterItemScore(characterId, wowheadId, lootItemId)
        if score then
            results[#results + 1] = score
        end
    end

    -- Sort by total score descending
    table.sort(results, function(a, b)
        if a.score ~= b.score then
            return a.score > b.score
        end
        -- Tiebreaker: higher rank wins
        return (a.rank or 0) > (b.rank or 0)
    end)

    return results
end

----------------------------------------------------------------------
-- Default settings (mirrors DEFAULT_SETTINGS in calculations.ts)
----------------------------------------------------------------------
local DEFAULTS = {
    attendance_type = "points-per-raid",
    rolling_attendance_weeks = 4,
    use_signups = true,
    signup_weight = 0.25,
    max_attendance_bonus = 4,
    max_attendance_threshold = 0.9,
    middle_attendance_bonus = 2,
    middle_attendance_threshold = 0.5,
    bottom_attendance_bonus = 1,
    bottom_attendance_threshold = 0.25,
    guild_rank_bonuses_enabled = true,
    rank_modifiers = {},
    raid_roles_overall_bonus_priority = false,
    role_modifiers = {},
    minimum_raid_days_enabled = true,
    minimum_raid_days = 2,
    late_early_penalty_enabled = true,
    late_early_penalty_value = 0.25,
    trial_penalty_enabled = false,
    trial_penalty_value = -2,
    blp_enabled = false,
    blp_increment = 1,
    blp_maximum = 5,
}

function SE:MergeDefaults(settings)
    local result = {}
    for k, v in pairs(DEFAULTS) do
        result[k] = v
    end
    if settings then
        for k, v in pairs(settings) do
            result[k] = v
        end
    end
    return result
end
