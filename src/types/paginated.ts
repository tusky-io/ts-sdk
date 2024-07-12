import { AxiosResponse } from "axios"

const PAGINATION_TOKEN = 'nextToken'

export type Paginated<T> = {
  items: Array<T>
  nextToken: string
  errors?: Array<ErrorItem>
}

export type ErrorItem = {
  id: string,
  error: Error
}

export const isPaginated = (response: AxiosResponse) => {
  return response.data[PAGINATION_TOKEN] !== undefined
}

export const nextToken = (response: AxiosResponse) => {
  return response.data[PAGINATION_TOKEN] === "null" ? "" : response.headers[PAGINATION_TOKEN]
}
