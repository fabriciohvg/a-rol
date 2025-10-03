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
export type ChurchType = 'Church' | 'Congregation' | 'Presbyterial Congregation' | 'Preaching Point'

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
  parent_church_id: string | null
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

// =====================================================
// MEMBER TYPES
// =====================================================

export type SexType = 'Male' | 'Female'

export type MaritalStatusType =
  | 'Single'
  | 'Married'
  | 'Separated'
  | 'Divorced'
  | 'Widowed'
  | 'Common-law union'

export type EducationLevelType =
  | 'Primary school'
  | 'High school'
  | 'Vocational/Technical'
  | 'College/University'
  | "Master's"
  | 'Doctorate'
  | 'Post-doc'
  | 'Illiterate'
  | 'Literate'
  | 'Not informed'

export type MemberStatusType =
  | 'Communicant'
  | 'Non-communicant'
  | 'Not a member'

export type MemberOfficeType =
  | 'Not an officer'
  | 'Deacon'
  | 'Elder'
  | 'Elder on availability'

export type AdmissionMethodType =
  | 'Baptism'
  | 'Profession of faith'
  | 'Baptism and Profession of faith'
  | 'Transfer'
  | 'Transfer of guardians'
  | 'Restoration'
  | 'Ex-officio jurisdiction'
  | 'Jurisdiction on request'
  | 'Jurisdiction over guardians'
  | 'Presbytery designation'

export type DismissalMethodType =
  | 'Disciplinary exclusion'
  | 'Exclusion on request'
  | 'Exclusion due to absence'
  | 'Transfer'
  | 'Transfer of guardians'
  | 'Transfer by session/council'
  | 'Jurisdiction assumed'
  | 'Jurisdiction over guardians'
  | 'Profession of faith'
  | 'Deceased'
  | 'Majority/coming of age'
  | "Guardians' request"

export type SituationType =
  | 'Active'
  | 'Inactive'
  | 'Attends'

export type FamilyRelationshipType =
  | 'Father'
  | 'Mother'
  | 'Spouse'
  | 'Brother/Sister'
  | 'Son/Daughter'

export interface Member {
  id: string

  // Personal Data
  photo_url: string | null
  name: string
  wife: string | null
  address: string
  address_line_2: string | null
  neighborhood: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  mobile: string
  email: string
  cpf: string
  date_of_birth: string
  place_of_birth: string
  sex: SexType

  // Additional Data
  marital_status: MaritalStatusType
  spouse: string | null
  wedding_date: string | null
  cpf_rg: string | null
  issuing_authority: string | null
  education_level: EducationLevelType | null
  profession: string | null
  mother_name: string | null
  father_name: string | null

  // Ecclesiastical Data
  church_id: string
  membership_number: string | null
  member_status: MemberStatusType
  office: MemberOfficeType
  baptism_date: string | null
  baptism_pastor: string | null
  baptism_church: string | null
  profession_of_faith_date: string | null
  profession_of_faith_pastor: string | null
  profession_of_faith_church: string | null
  admission_date: string
  admission_method: AdmissionMethodType
  dismissal_date: string | null
  dismissal_method: DismissalMethodType | null
  situation: SituationType
  disciplined: boolean
  discipline_date: string | null
  discipline_notes: string | null
  pending_transfer: boolean

  // History
  history: string | null

  // Standard fields
  created_at: string
  updated_at: string
}

export type MemberInsert = Omit<Member, 'id' | 'membership_number' | 'created_at' | 'updated_at'>
export type MemberUpdate = Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>>

export interface MemberFamilyRelationship {
  id: string
  member_id: string
  related_member_id: string
  relationship_type: FamilyRelationshipType
  created_at: string
}

export type MemberFamilyRelationshipInsert = Omit<MemberFamilyRelationship, 'id' | 'created_at'>
export type MemberFamilyRelationshipUpdate = Partial<Omit<MemberFamilyRelationship, 'id' | 'created_at'>>

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
      members: {
        Row: Member
        Insert: MemberInsert
        Update: MemberUpdate
      }
      member_family_relationships: {
        Row: MemberFamilyRelationship
        Insert: MemberFamilyRelationshipInsert
        Update: MemberFamilyRelationshipUpdate
      }
    }
    Enums: {
      office_role: OfficeRole
      presbytery_type: Presbytery
      church_type: ChurchType
      sex_type: SexType
      marital_status_type: MaritalStatusType
      education_level_type: EducationLevelType
      member_status_type: MemberStatusType
      office_type: MemberOfficeType
      admission_method_type: AdmissionMethodType
      dismissal_method_type: DismissalMethodType
      situation_type: SituationType
      family_relationship_type: FamilyRelationshipType
    }
  }
}
