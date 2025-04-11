import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Success<T> = {
  data: T,
  error: null
}

type Failure<E> = {
  data: null,
  error: E
}

type Result<T, E = Error> = Success<T> | Failure<E>

export async function asyncTryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const data = await promise
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err as E } }
}

export function tryCatch<T, E = Error>(fn: T): Result<T, E> {
  try {
    const data = fn
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err as E } }
}

