import { AxiosResponse } from "axios"

const PAGINATION_HEADER = 'next-page'

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
  return response.headers[PAGINATION_HEADER] !== undefined
}

export const nextToken = (response: AxiosResponse) => {
  return response.headers[PAGINATION_HEADER] === "null" ? "" : response.headers[PAGINATION_HEADER]
}
