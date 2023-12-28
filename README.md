
#### heygen-auto-register
```
run: 
    邮件内容获取的服务 python email_service
    本地启动自动化注册 python register.py

```

#### 项目演示：
https://github.com/Filifun/heygen-auto-register/assets/154949539/320338f3-d23f-4c39-9d47-171931031f2b


#### 项目介绍与注意事项： 
本项目用于自动化在heygen网站上进行注册的脚本。仅供学习参考
使用了 Playwright 库来与 Chromium 浏览器进行交互。模拟人的行为进行操作

需要用到：
chrome浏览器、相关库依赖在requirements

## 关于Google人机验证的处理（可选）
第三方充值，用于GOOGLE验证 https://yescaptcha.com/
可以注册后，找客服送 1500个点测试用
充值后，记录您的 密钥 ClientKey
将源码的 app 目录 下面的 env.example 改名为 .env 里面的KEY,用第二步自己的
如果需要用插件破解谷歌认证，则 extensions/yescaptcha/config.js将clientKey的值改成自己的

## heygen交流群
添加WX/DY：Filifun（请备注说明，拉你进群）
