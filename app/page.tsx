'use client'

import { createStore } from "../shared-state"
import { Suspense, useEffect } from "react"

const {
  Privoider,
  useStore,
  useSyncStore,
  useSuspenseStore
} = createStore({ text: 'text', num: 1 })

const Page = () => {
  return (
    <Privoider>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Text></Text>
        <Num></Num>
        <Suspense fallback={'loading num...'}>
          <NumSuspense></NumSuspense>
        </Suspense>
      </div>
    </Privoider>
  )
}

export default Page


const Text = () => {
  const [sharedState, setSharedState] = useStore()
  console.log('text')
  useEffect(() => {
    console.log('text effect')
  })
  return <input onChange={e => setSharedState(draft => { draft.text = e.target.value })} value={sharedState.text}></input>
}
const Num = () => {
  const [sharedState, setSharedState] = useStore()
  const increase = () => setSharedState(state => { state.num += 1 })
  return <button onClick={increase}>num {sharedState.num}</button>
}


const NumSuspense = () => {
  const [sharedState, setSharedState] = useSuspenseStore(1000)
  console.log('num')
  useEffect(() => {
    console.log('num effect')
  })
  const increase = () => setSharedState(state => { state.num += 1 })
  return <button onClick={increase}>num {sharedState.num}</button>
}