/**
 * ! This should be deleted as soon as hapipal types
 * ! are accepted publicly.
 */

type keyOfRandom = (
    'a' | 'b' | 'c' | 'd' | 'e' |
    'f' | 'g' | 'h' | 'i' | 'j' |
    'k' | 'l' | 'm' | 'n'
)

export interface id {

    /**
     * Generates a random UUID
     */
    generate(): string

    criteria <U extends string>(uuid: U): {
        $id: U,
        random: Record<keyOfRandom, number>
    }
}

type KeyValsAsType<T> = {
    [
        K in keyof T as T[K] extends string ? (
            string extends T[K] ? never : T[K]
        ) : never
    ]?: AllowedValues<T>
};

type AllowedValues<Criteria> = (
    number | string | boolean |
    Array<any> | typeof Function |
    Schema<Criteria>
);

type Schema<Criteria> = {
    $param: keyof Criteria,
    $value?: AllowedValues<Criteria>
    $replace?: 'true' | true,
    $env?: keyof Criteria
    $coerce?: 'number' | 'array' | 'boolean' | 'object'
    $splitToken?: string | RegExp
    $filter?: keyof Criteria | { $env: keyof NodeJS.ProcessEnv },
    $base?: AllowedValues<Criteria>,
    $default?: AllowedValues<Criteria>
    $id?: string,
    $range?: {
        limit: number,
        value: AllowedValues<Criteria>,
        id: string
    }[]
    $meta?: object | string,
} | KeyValsAsType<Criteria>

type ValueOf<T> = T[keyof T];

type FilterType<C, T extends string> = {
    $filter?: C,
} | Record<T, string>

type InferFromObject<T, K extends keyof T = keyof T> = T[K] extends infer C ? C : T[K];

/**
 *
 */
type ConfidenceStore<
    Criteria,
    ReturnType
> = (
    {
        [K in keyof ReturnType]: ConfidenceStore<
            Criteria,
            ReturnType[K]
        > | Schema<Criteria>
    } |
    {
        [K in keyof Schema<Criteria>]: (
            ConfidenceStore<Criteria, ReturnType> |
            KeyValsAsType<Criteria>
        )
    }
);

/**
 * Finds the '/' slash path in a type starting from the beginning.
 */
type _Path<T, K extends keyof T> = (
    K extends string ? (
        T[K] extends Record<string, any> ? (
            T[K] extends ArrayLike<any> ? (
                `/${K}` | `/${K}${_Path<T[K], Exclude<keyof T[K], keyof any[]>>}`
            ) : (
                `/${K}` | `/${K}${_Path<T[K], keyof T[K]>}`
            )
        ) : `/${K}`
    ) : never
);

// The actual path implementation
type Path<T> = '/' | _Path<T, keyof T>;

type PathValueImp<T, P extends Path<T>> =  P extends `/${infer UKey}` ? (
    P extends `/${infer LKey}/${infer Rest}` ? (
        LKey extends keyof T ? (
            Rest extends keyof T[LKey] ? (
                T[LKey][Rest]
            ) : (
                `/${Rest}` extends Path<T[LKey]> ? (
                    PathValueImp<T[LKey], `/${Rest}`>
                ) : never
            )
        ) : never
    ) : (
        UKey extends keyof T ? T[UKey] : never
    )
) : never

type PathValue<T, P extends Path<T>> = P extends '/' ? T : PathValueImp<T, P>

export class Store<Criteria, ReturnType> {

    constructor (document: ConfidenceStore<Criteria, ReturnType>);

    load(document: ConfidenceStore<Criteria, ReturnType>): void;

    get <K extends Path<ReturnType>> (key: K, criteria: Criteria): PathValue<ReturnType, K>

    meta <K extends Path<ReturnType> = '/'>(key: K, criteria: Criteria): any;

    static validate <T extends ConfidenceStore<any, any>>(node: T): Error | null;

}
