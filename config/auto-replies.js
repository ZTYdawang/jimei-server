// 智能客服自动回复配置
const AUTO_REPLIES = {
  // 首次立即回复（用户发送消息后立即显示）
  IMMEDIATE_REPLIES: [
    "小集已收到，正在帮你解决",
    "小集已收到您的问题，正在为您查询",
    "小集收到了，正在努力为您解答",
    "小集已接收到您的问题，正在处理中",
    "小集已收到，马上为您解决",
    "小集收到您的问题了，正在分析中",
    "小集已收到消息，正在为您处理",
    "小集已接收，正在努力解决您的问题"
  ],

  // 15秒后的第二次回复（如果AI还没有返回结果）
  DELAYED_REPLIES: [
    "请耐心等待一下，小集正在加急处理您的问题",
    "请稍等片刻，小集正在努力为您查找答案",
    "小集正在仔细分析您的问题，请稍候",
    "请您稍等，小集正在全力解决您的问题",
    "抱歉让您久等了，小集正在紧急处理中",
    "请耐心等候，小集正在为您寻找最佳解决方案",
    "小集正在认真处理您的问题，请稍等片刻",
    "请稍作等待，小集正在加快处理速度",
    "小集正在仔细核查信息，请您稍等",
    "请您耐心等待，小集正在尽快为您解答",
    "小集正在努力获取准确信息，请稍候"
  ],

  // 获取随机立即回复
  getRandomImmediateReply() {
    const replies = this.IMMEDIATE_REPLIES;
    return replies[Math.floor(Math.random() * replies.length)];
  },

  // 获取随机延迟回复
  getRandomDelayedReply() {
    const replies = this.DELAYED_REPLIES;
    return replies[Math.floor(Math.random() * replies.length)];
  }
};

module.exports = AUTO_REPLIES;