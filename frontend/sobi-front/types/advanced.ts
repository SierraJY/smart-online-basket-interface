// 고급 타입 유틸리티 및 타입 가드 함수들
import React from 'react';

// 기본 타입 가드 함수들
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

// Promise 타입 가드
export function isPromise<T>(value: unknown): value is Promise<T> {
  return isObject(value) && 'then' in value && isFunction((value as Record<string, unknown>).then);
}

// 에러 타입 가드
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isErrorWithCode(value: unknown): value is Error & { code: string } {
  return isError(value) && 'code' in value && typeof (value as Record<string, unknown>).code === 'string';
}

// 타입 안전한 이벤트 핸들러
export type EventHandler<T = Event> = (event: T) => void | Promise<void>;
export type FormEventHandler = EventHandler<React.FormEvent>;
export type ChangeEventHandler = EventHandler<React.ChangeEvent<HTMLInputElement>>;

// 타입 안전한 API 클라이언트
export interface ApiClient {
  get<T>(url: string, config?: RequestInit): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
  delete<T>(url: string, config?: RequestInit): Promise<T>;
}
