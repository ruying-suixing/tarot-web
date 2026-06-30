// 固定配置
const API_KEY = "7a731303e72744e287a21daa021eaa3f.fMYf7XN1zGJLrQqs";
const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL = "glm-4.7-flash";

export async function onRequestPost({ request }) {
  // 全局异常兜底：所有错误都返回正常HTTP响应，杜绝1101崩溃
  try {
    // 1. 安全解析请求体，捕获JSON解析失败
    let bodyJson;
    try {
      bodyJson = await request.json();
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "请求体JSON格式错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json;charset=utf-8" }
      });
    }

    // 2. 校验必填参数
    const { text, pms } = bodyJson;
    if (!text || !Array.isArray(pms)) {
      return new Response(JSON.stringify({ error: "缺少参数 text 或 pms 卡牌数组" }), {
        status: 400,
        headers: { "Content-Type": "application/json;charset=utf-8" }
      });
    }

    // 3. 构造AI请求体（原塔罗牌解析逻辑100%保留）
    const reqBody = {
      model: MODEL,
      stream: false,
      temperature: 0,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
      messages: [
        {
          role: "system",
          content: `现在你是塔罗牌大师，根据我所选的牌去根据问题去解析，使用的是22张大阿尔克那牌，{"0": "愚者","1": "魔术师","2": "女祭司","3": "皇后","4": "皇帝","5": "教皇","6": "恋人","7": "战车","8": "力量","9": "隐士","10": "命运之轮","11": "正义","12": "倒吊人","13": "死神","14": "节制","15": "恶魔","16": "塔","17": "星星","18": "月亮","19": "太阳","20": "审判","21": "世界"}，下面我将以数组的形式给你卡牌，其中isReversed代表是否为逆位，no为从 0 到 21 对应的22张大阿尔克那牌，你在解析的时候，需要把0-21用22张大阿尔克那牌对应的名称回答，你只需要解释卡牌的含义及解析，最后结尾用百分比表示问题的概率，不用回答多余的话`
        },
        {
          role: "user",
          content: `卡牌数组是：${JSON.stringify(pms)}，问题是：'${text}？'，请帮我解析`
        }
      ]
    };

    // 4. 请求智谱官方接口
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    // 5. 校验接口响应状态，非成功直接返回错误，不崩溃
    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({
        error: `AI接口请求失败，状态码${res.status}`,
        detail: errText
      }), {
        status: 500,
        headers: { "Content-Type": "application/json;charset=utf-8" }
      });
    }

    // 6. 解析返回数据，做结构容错
    const data = await res.json();
    if (!data?.choices?.length || !data.choices[0]?.message?.content) {
      return new Response(JSON.stringify({ error: "AI返回数据格式异常" }), {
        status: 500,
        headers: { "Content-Type": "application/json;charset=utf-8" }
      });
    }

    // 7. 正常返回解析结果
    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });

  } catch (globalErr) {
    // 兜底所有未知异常，输出到日志同时返回友好提示
    console.error("Worker执行异常：", globalErr);
    return new Response(JSON.stringify({
      error: "服务内部异常",
      message: globalErr.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json;charset=utf-8" }
    });
  }
}
