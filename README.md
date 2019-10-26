# gulp-seed
#### 使用 node + gulp 搭建前端自动化本地开发环境的预配置文件及目录结构

1. 安装 nodejs 
    下载地址：[nodejs](https://nodejs.org/en/download/)
    进入命令行
    输入如下命令

  ```
  $ node -v
  ```

  如果出现版本号，则安装成功，否则请重新安装或检查环境变量

  ![image](http://p1.bpimg.com/567571/2c61fc929668bf1a.png)

2. 安装 npm 淘宝镜像 cnpm  
    cnpm 说明： [npm 淘宝镜像](https://npm.taobao.org/)  
    进入 命令行 执行如下命令
    
  ```
  $ npm install -g cnpm --registry=https://registry.npm.taobao.org
  ```

3. 全局安装 gulp 

  ```
  $ cnpm install -g gulp
  ```

4. 复制已配置好的 gulp-seed 文件到项目目录  
    文件地址：[gulp-seed](https://github.com/Scimanyd/gulp-seed)
    ![image](http://p1.bpimg.com/567571/fbffba69de36d59f.png)
    目录结构  
    ![image](http://p1.bqimg.com/567571/2902a260ebd11773.png)

5. 初始化安装
    将控制台当前目录切换为项目目录
    然后执行初始化安装命令

  ```
  $ cnpm install
  ```

6. 就可以开启服务愉快的码字了

  ```
  $ gulp dev
  ```
  ![image](http://p1.bqimg.com/567571/f61c2d3b2dadc914.png)
  ![image](http://p1.bpimg.com/567571/091c517117ca5d79.png)


  修改src中的任一文件并保存，即可立即在浏览器上刷新显示

  ![image](http://i1.piimg.com/567571/de677890b9af5760.png)
