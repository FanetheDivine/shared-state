import { Draft, produce } from 'immer'
import { createContext, createElement, FC, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createProxy, isChanged } from 'proxy-compare'

/**
 * 创建共享存储
 * @param initState 初始值
 * @example
 * const { Privoider, useStore } = createStore({ text: 'text', num: 1 })
 * 
 * export default const App = () => {
 *  return <Privoider><Comp/></Privoider>
 * }
 * 
 * const Comp = () => {
 *  const [sharedState,setSharedState] = useStore()
 *  const increase = () => {
 *    setSharedState(state => {
 *      state.count += 1
 *    })
 *  }
 *  return <button onClick={increase}>{state.count}</button>
 * }
 */
export const createStore = <T>(initState: T) => {
  const contextValue = getContextValue(initState)
  const Context = createContext(contextValue)
  // 热重载会重新调用createStore 通过闭包存储共享状态会导致监听器无法正常绑定
  const Privoider: FC<PropsWithChildren> = props => {
    return createElement(
      Context.Provider,
      { value: contextValue },
      props.children
    )
  }

  /** 三种更新方式的共通行为 */
  const useCommon = () => {
    const { initState, sharedStateRef, updateSharedState, sharedStateListeners } = useContext(Context)

    // 本地状态.共享状态的某个版本 确保组件引用的属性与最新版本相同
    const stateRef = useRef<T>(sharedStateRef.current)
    // 使用proxy-compare获得一个代理 可以记录组件访问的属性
    const affected = useMemo(() => new WeakMap(), [])
    const proxyCache = useMemo(() => new WeakMap(), [])
    const getStateProxyRef = useRef(() => {
      return createProxy(stateRef.current, affected, proxyCache)
    })

    /** 存储用于更新组件的回调函数 */
    const callbackRef = useRef<() => void>()
    /** 共享状态监听函数 */
    const listenerRef = useRef(() => {
      if (
        callbackRef.current
        && stateRef.current !== sharedStateRef.current
        && isChanged(stateRef.current, sharedStateRef.current, affected)
      ) {
        stateRef.current = sharedStateRef.current
        callbackRef.current()
      }
    })
    const addListenerRef = useRef((callback: () => void) => {
      if (!callbackRef.current) {
        sharedStateListeners.add(listenerRef.current)
      }
      callbackRef.current = callback
    })
    const removeListenerRef = useRef(() => {
      sharedStateListeners.delete(listenerRef.current)
      callbackRef.current = undefined
    })
    return {
      initState,
      getStateProxy: getStateProxyRef.current,
      updateSharedState,
      addListener: addListenerRef.current,
      removeListener: removeListenerRef.current,
    }
  }

  /** 以常规方式更新组件 使用setState进行更新 */
  const useStore = () => {
    const { getStateProxy, updateSharedState, addListener, removeListener } = useCommon()
    const [stateProxy, setStateProxy] = useState(getStateProxy)
    const subscribe = useCallback(() => {
      addListener(() => setStateProxy(getStateProxy))
    }, [addListener, setStateProxy, getStateProxy])
    subscribe()
    useEffect(() => {
      subscribe()
      return removeListener
    }, [removeListener, subscribe])

    return [stateProxy, updateSharedState] as const
  }

  /** 以同步方式更新组件 用useSyncExternalStore进行更新 */
  const useSyncStore = () => {
    const { initState, getStateProxy, updateSharedState, addListener, removeListener } = useCommon()
    const subscribe = useCallback((callback: () => void) => {
      addListener(callback)
      return removeListener
    }, [addListener, removeListener])
    const stateProxy = useSyncExternalStore(subscribe, getStateProxy, () => initState)
    return [stateProxy, updateSharedState] as const
  }

  /**
   * 以异步方式进行更新 更新期间Suspense会切换至fallback
   * @param delay 更新耗时至少delay毫秒
   */
  const useSuspenseStore = (delay: number = 0) => {
    const { getStateProxy, updateSharedState, addListener, removeListener } = useCommon()
    const [stateProxy, setStateProxy] = useState(getStateProxy)
    const [updatePromise, setUpdatePromise] = useState<Promise<void>>()
    if (updatePromise) {
      throw updatePromise
    }
    const subscribe = useCallback(() => {
      addListener(() => {
        setUpdatePromise(
          new Promise<void>(resolve => setTimeout(() => {
            setStateProxy(getStateProxy)
            setUpdatePromise(undefined)
            resolve()
          }, delay))
        )
      })
    }, [addListener, delay, setUpdatePromise, setStateProxy, getStateProxy])
    subscribe()
    useEffect(() => {
      subscribe()
      return removeListener
    }, [removeListener, subscribe])

    return [stateProxy, updateSharedState] as const
  }

  return {
    /** 共享状态上下文 */
    Privoider,
    /** 以常规方式更新组件 */
    useStore,
    /** 以同步方式更新组件 */
    useSyncStore,
    /** 
     * 更新时Suspense切换至fallback
     * @param delay 更新耗时至少delay毫秒
    */
    useSuspenseStore
  }
}

const getContextValue = <T>(initState: T) => {
  const sharedStateRef = { current: initState }
  const sharedStateListeners = new Set<() => void>()
  const updateSharedState = (mutation: (draft: Draft<T>) => void) => {
    sharedStateRef.current = produce(sharedStateRef.current, mutation)
    sharedStateListeners.forEach(fn => fn())
  }
  const contextValue = {
    initState,
    sharedStateRef,
    updateSharedState,
    sharedStateListeners
  }
  return contextValue
}