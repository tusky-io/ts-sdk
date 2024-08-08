export type User = {
  address: string,
  publicSigningKey: string,
  publicKey: string,
  email: string,
} & UserMutable

export type UserMutable = {
  name?: string,
  picture?: string,
  trashExpiration?: number,
  termsAccepted?: boolean // by setting it to true, the user accepts following terms: https://akord.com/terms-of-service-consumer
}

export type UserPublicInfo = {
  address: string,
  publicSigningKey: string,
  publicKey: string
}