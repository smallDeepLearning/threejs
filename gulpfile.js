var gulp = require('gulp'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    notify = require('gulp-notify'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    browserSync = require('browser-sync')

var origin = './src'
var port = 8099
var flag = 1
// 实时编译 scss
gulp.task('scss2css', function () {
  // 避免磁盘保存过慢导致未发现依赖的文件
  // 详见如下解释
  // http://www.cnblogs.com/venoral/p/6130353.html
  if (flag) {
    flag = 0
    setTimeout(function(){
      flag = 1
      return gulp.src( origin + '/sass/style.scss' )
      // sourcemaps, 用于定位 scss 源文件
      .pipe(sourcemaps.init())
        .pipe(sass())
      .pipe(sourcemaps.write())
      .pipe(postcss( [ autoprefixer({
        browsers: ['last 2 Chrome versions', 'safari 5', 'ios 7', 'android 4'],
        cascade: false
      }) ] ))
      .pipe(gulp.dest(origin + '/css'))
      .pipe(notify({
        message: 'Scss2css commpleted.'
      }))
    },120)
  }
  
})

// 服务器，自动刷新
gulp.task('server', function () {
  browserSync({
    ui: false, // 可视化控制页面
    server: {
      baseDir: origin,  // 服务器文件地址
      directory: false  // 是否显示目录
    },
    notify: false,  // 是否显示提示信息
    ghostMode: {
      clicks: true,
      forms: true,
      scroll: true
    },
    // ghostMode: false, // 点击，滚动和表单在任何设备上输入将被镜像到所有设备里
    port: port, // 端口号
    open: 'external', // 打开外部URL -必须在网上 
  })
})

// 开发
gulp.task('dev', ['scss2css', 'server'], function () {
  var reload = browserSync.reload

  gulp.watch('./src/sass/*.scss', ['scss2css'])
  gulp.watch('./src/index.html', reload)
  gulp.watch('./src/css/*', reload)
  gulp.watch('./src/js/*', reload)
})

gulp.task('default', ['dev'])
