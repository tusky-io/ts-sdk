export type User = {
  address: string,
  publicSigningKey: string,
  publicKey: string,
  email: string,
  profileName?: string,
  avatar?: string[]
}

export type UserPublicInfo = {
  address: string,
  publicSigningKey: string,
  publicKey: string
}