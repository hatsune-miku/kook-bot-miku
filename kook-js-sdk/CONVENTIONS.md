project-instructions

# 技术细节

你需要从一开始就做到：

- 坚持模块化设计。
- 坚持单一职责原则。
- 坚持激进的 DRY 原则。对于重复第 2 遍的代码，不用犹豫，抽象出来。
- 敢于重构甚至推翻。在编码过程中发现设计不合理，或者代码写得不好看，不要犹豫，重构甚至推翻。

## 工具链

- 优先使用 `Bun`，其次才考虑 `Node.js`。如果使用后者，包管理器选择 `yarn`。
- 使用 `ESlint` 和 `Prettier` 进行代码规范和格式化。
- 引入 Trivago 的 import 排序插件。

## 编码规范

### TypeScript & CSS

- 绝对禁止使用 `throw`。
- 你无需避免 `null` 和 `undefined`，而是应该以正确语义来善用它们。
- 避免使用 `try` 和 `catch`，只是有的时候三方库会抛异常，你才可以被迫使用 `try` 和 `catch`。
- 不要通过 `!!` 写法来转换布尔值。
- 不要通过 `cond && foo()` 写法来实现分支逻辑。
- 善用 `.`, `, `, `.()` 等语法糖。
- 使用 `function` 定义 function。
- 对于 boolean 类型，避免 `isFoo` 命名，而是省略 `is`，直接写 `foo`。
- 省略行末分号。
- 禁止出现注释和代码在同一行的写法。具体来说，你应该避免：

  ```ts
  const foo = 'foo' // Some comment
  const bar = 'bar' // Some comment
  ```

  而是应该写成：

  ```ts
  // Some comment
  const foo = 'foo'

  // Some comment
  const bar = 'bar'
  ```

- 避免 `enum` 关键字，使用 `as const` 和 `type` 来代替。具体来说，你应该避免：

  ```ts
  避免此种写法
  export enum ModelKind {
    anthropic = 'anthropic',
    openai = 'openai',
  }
  ```

  作为替代，你应该写：

  ```ts
  提倡此种写法
  export const ModelKinds = ['anthropic', 'openai'] as const
  export type ModelKind = (typeof ModelKinds)[keyof typeof ModelKinds]
  ```

- 避免创建无名类型。具体来说，你应该避免：

  ```ts
  function foo({ data } { data string }) { code number } {
    return {
      code 0,
    }
  }
  ```

  而是应该写：

  ```ts
  interface Data {
    data string
  }

  interface Response {
    code number
  }

  function foo({ data } Data) Response {
    return {
      code 0,
    }
  }
  ```

- 你可以善用 `any`。使用 `any` 时，你可以通过直接省略类型定义来暗示这是 `any` 类型。在 `tsconfig.json` 中，也应当确保任何对于 `any` 的使用都是显式允许的，例如 `noImplicitAny: false`。
- 使用 `import { FooComponent } from '.FooComponent'`，而不是 `import { FooComponent } from '.FooComponent.js'`。不要使用那些必须写 `.js` 后缀的模块系统。
