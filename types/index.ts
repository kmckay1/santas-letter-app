export interface ChildInfo {
    name: string
    age: string
    behaviorRating: number
    behaviorNotes: string
    wishes: string[]
    parentNotes: string
    recipientEmail: string
  }
  
  export interface GeneratedLetter {
    content: string
    childName: string
    createdAt: string
  }
  
  export type PricingTier = 'free' | 'premium' | 'physical' | 'bundle'