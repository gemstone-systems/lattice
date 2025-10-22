export type Ok<T = void> = T extends undefined
    ? { ok: true }
    : { ok: true; data: T };

export type Err<E = void> = E extends undefined
    ? { ok: false }
    : { ok: false; error: E };

export type Result<T = void, E = void> = Ok<T> | Err<E>;

export const okResult = <T = void>(data?: T): Ok<T> =>
    data === undefined
        ? ({ ok: true } as Ok<T>)
        : ({ ok: true, data } as Ok<T>);

export const errResult = <E = void>(error?: E): Err<E> =>
    error === undefined
        ? ({ ok: false } as Err<E>)
        : ({ ok: false, error } as Err<E>);
