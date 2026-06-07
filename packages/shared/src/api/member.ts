export interface QuotaStatus {
  exempt: boolean
  used: number
  limit: number | null
  remaining: number | null
  periodStart: string
  periodEnd: string
  planCode?: string
  planName?: string
  subscriptionStatus?: string
  trialEndsAt?: string | null
  trialDaysRemaining?: number | null
}

export interface MemberProfile {
  username: string
  displayName: string | null
  status: string
  provider: {
    id: string
    name: string
    provider: string
    model: string
  } | null
  quota?: QuotaStatus
}
