// tarot-web/functions/api.js
export async function onRequestPost({ request }) {
  // 全局异常捕获，所有报错都返回正常HTTP响应，杜绝1101
  try {
    // 1. 校验请求类型
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "仅支持POST请求" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 安全解析请求体，捕获JSON解析失败
    let bodyJson;
    try {
      bodyJson = await request.json();
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "请求体JSON格式错误" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. 校验必填参数
    const { text, pms } = bodyJson;
    if (!text || !Array.isArray(pms)) {
      return new Response(JSON.stringify({ error: "缺少参数text或pms卡牌数组" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 构造AI请求体
    const reqBody = {
      messages: [
        {
          role: "system",
          content: `现在你是塔罗牌大师，根据我所选的牌去根据问题去解析，使用的是22张大阿尔克那牌，{"0": "愚者","1": "魔术师","2": "女祭司","3": "皇后","4": "皇帝","5": "教皇","6": "恋人","7": "战车","8": "力量","9": "隐士","10": "命运之轮","11": "正义","12": "倒吊人","13": "死神","14": "节制","15": "恶魔","16": "塔","17": "星星","18": "月亮","19": "太阳","20": "审判","21": "世界"}，下面我将以数组的形式给你卡牌，其中isReversed代表是否为逆位，no为从 0 到 21 对应的22张大阿尔克那牌，你在解析的时候，需要把0-21用22张大阿尔克那牌对应的名称回答，你只需要解释卡牌的含义及解析，最后结尾用百分比表示问题的概率，不用回答多余的话`
        },
        {
          role: "user",
          content: `卡牌数组是：${JSON.stringify(pms)}，问题是：'${text}？'，请帮我解析`
        }
      ],
      stream: false,
      model: "glm-4-flash",
      temperature: 0,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1
    };

    // 4. 请求AI接口，捕获网络/超时错误
    const res = await fetch("https://nas-ai.4ce.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer sk-L8W2WtnCtdwG6nctF975D0E770144dE5Be3123Fa16720a03",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    // 校验AI接口返回状态
    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({
        error: `AI接口请求失败，状态码${res.status}`,
        detail: errText
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 解析AI返回数据
    const data = await res.json();
    // 容错：choices不存在或为空
    if (!data?.choices?.length) {
      return new Response(JSON.stringify({ error: "AI返回数据为空" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 正常返回解析文本
    return new Response(data.choices[0].message.content, {
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });

  } catch (globalErr) {
    // 兜底捕获所有未知异常，输出错误信息，不会再触发1101
    console.error("Worker全局异常：", globalErr);
    return new Response(JSON.stringify({
      error: "服务内部异常",
      msg: globalErr.message,
      stack: globalErr.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
