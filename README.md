# shared-state
react状态管理工具
# 用法
```tsx
const { Privoider, useStore } = createStore({ text: 'text', num: 1 })
export default const App = () => {
 return <Privoider><Comp/></Privoider>
}

const Comp = () => {
 const [sharedState,setSharedState] = useStore()
 const increase = () => {
   setSharedState(state => {
     state.count += 1
   })
 }
 return <button onClick={increase}>{state.count}</button>
}
 ```
# 特点
* 通过immer简化状态更新
* 通过proxy-compare捕获依赖属性并仅在这些属性变动时更新组件
* 提供不同优先级的更新策略
# 源码
`./shared-state/index.ts`
# 示例
`npm run example`  
示例源码`./app/page.tsx`
