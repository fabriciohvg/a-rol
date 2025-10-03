export interface Profile {
  id: string
  updated_at: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  website: string | null
  role: 'user' | 'administrator'
}

export type OfficeRole = 'Pastor'
export type Presbytery = 'PANA' | 'PNAN'
export type ChurchType = 'Church'

export interface Pastor {
  id: string
  name: string
  cpf: string
  date_of_birth: string
  ordination_date: string
  office: OfficeRole
  presbytery: Presbytery
  email: string
  phone: string
  mobile: string
  address: string
  address_line_2: string | null
  neighborhood: string
  city: string
  state: string
  postal_code: string
  country: string
  wife: string | null
  photo_url: string | null
  retired: boolean
  retirement_date: string | null
  deceased: boolean
  deceased_date: string | null
  released_from_office: boolean
  released_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PastorInsert = Omit<Pastor, 'id' | 'created_at' | 'updated_at'>
export type PastorUpdate = Partial<Omit<Pastor, 'id' | 'created_at' | 'updated_at'>>

export interface Church {
  id: string
  photo_url: string | null
  type: ChurchType
  name: string
  address: string
  neighborhood: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  website: string | null
  email: string
  cnpj: string
  lead_pastor_id: string
  assistant_pastor_ids: string[]
  organization_date: string
  presbytery: Presbytery
  notes: string | null
  created_at: string
  updated_at: string
}

export type ChurchInsert = Omit<Church, 'id' | 'created_at' | 'updated_at'>
export type ChurchUpdate = Partial<Omit<Church, 'id' | 'created_at' | 'updated_at'>>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      pastors: {
        Row: Pastor
        Insert: PastorInsert
        Update: PastorUpdate
      }
      churches: {
        Row: Church
        Insert: ChurchInsert
        Update: ChurchUpdate
      }
    }
    Enums: {
      office_role: OfficeRole
      presbytery_type: Presbytery
      church_type: ChurchType
    }
  }
}
