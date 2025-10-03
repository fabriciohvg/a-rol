export interface Profile {
  id: string
  updated_at: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  website: string | null
}

export type OfficeRole = 'Pastor'
export type Presbytery = 'PANA' | 'PNAN'

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
    }
    Enums: {
      office_role: OfficeRole
      presbytery_type: Presbytery
    }
  }
}
