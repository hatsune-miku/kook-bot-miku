import { draw } from 'radash'
import { ContextUnit } from 'src/utils/config/types'

import { ToolFunctionContext } from './functional/types'

export async function chatCompletionStreamed(
  _0: ToolFunctionContext,
  context: ContextUnit[],
  _1: string,
  onMessage: (message: string) => Promise<void>,
  onMessageEnd: (message: string, tokens: number, reasoningSummary: string | null) => void
) {
  if (context.length === 0) {
    const emptyCandidates = [
      '我是西安本地人，今年26岁，身高168，体重50公斤。现在是西安的事业单位编制，研究生学历。我平时比较喜欢旅游、美食、看电影，也喜欢小宠物，特别喜欢小猫。我的性格比较温柔，比较开朗乐观，平时生活比较简单，圈子也小。',
      '我是上个星期跟您连过线的，那个咨询我女儿的事情的。当时我就说我女儿谈了一个男朋友，他们俩相处了半年，就谈到了钱，她男朋友就跟我女儿分手了。',
      '后来我女儿说她那个男朋友又联系她了，但是我女儿不跟她和好。不跟她和好呢，我就劝我女儿，我说你还是跟她和好，我说我觉得你男朋友那个人也还可以，就是钱看得重一点，其他方面还可以。',
      '我就劝我女儿跟他和好了。和好了之后，这不又相处了两个月。相处这两个月呢，我女儿觉得还是不好，因为那个男孩子一分钱都不舍得花。我女儿就生气了，就又跟他分手了。现在是这个情况，我女儿跟他分手了以后，我们家女儿心情不好，她又去追一个男孩子，追那个男孩子也是失败了。现在我女儿，',
      '她就不想谈了，她就现在就不想谈了。但是呢，我就觉得我女儿因为她也没工作，现在在家。我就觉得她不谈的话，她老是，她现在没工作，我给她找了工作，她也不去。她就在家这样，我就觉得她这样，我觉得她老是谈男朋友，谈了又不成功，又分手。我现在不知道怎么办了。',
    ]
    onMessage(draw(emptyCandidates))
    return
  }
  const lastContext = context[context.length - 1]
  let prompt = lastContext.content
  prompt = prompt.replace(/吗/g, '')
  prompt = prompt.replace(/不/g, '')
  prompt = prompt.replace(/你/g, '我')
  prompt = prompt.replace(/有/g, '没有')
  prompt = prompt.replace(/吧/g, '')
  prompt = prompt.replace(/？/g, '！')
  setTimeout(() => {
    onMessage(prompt)
    setTimeout(() => {
      onMessageEnd(prompt, 0, null)
    }, 1000)
  }, 1000)
}
