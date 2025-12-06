import { useEffect, type EffectCallback } from 'react'

// eslint-disable-next-line react-hooks/exhaustive-deps
export const useMount = (f: EffectCallback) => useEffect(f, [])
