import gulp from 'gulp';
import del from 'del';
import gulpif from 'gulp-if';
import gutil from 'gulp-util';
import plumber from 'gulp-plumber';
import notifier from 'node-notifier';
import runSequence from 'run-sequence';
import { create as bsCreate } from 'browser-sync';

// styles
import sass from 'gulp-sass';
import sourcemaps from 'gulp-sourcemaps';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

// scripts
import gulpWebpack from 'gulp-webpack';
import webpack from 'webpack';
import webpackConfigWrapper from './webpack.config.babel'
import eslint from 'gulp-eslint';

// templates
import nunjucksRender from 'gulp-nunjucks-render';

// images
import imagemin from 'gulp-imagemin';


const config = {
    dest: 'dist/',
    templates: {
        src: ['src/templates/**/*.html', '!src/templates/+(layouts|components)/**'],
        dest: 'dist',
        watch: 'src/templates/**/*.html',
        basePath: 'src/templates/'
    },
    scripts: {
        src: './src/assets/scripts/main.js',
        dest: './dist/assets/scripts/',
        watch: './src/assets/scripts/**/*'
    },
    styles: {
        src: './src/assets/styles/main.scss',
        dest: './dist/assets/styles/',
        browsers: ['last 1 version'],
        watch: './src/assets/styles/**/*'
    },
    images: {
        src: 'src/assets/images/**/*',
        dest: 'dist/assets/images',
        watch: 'src/assets/images/**/*'
    },
    dev: gutil.env.dev
};

const reportError = function (error) {
    notifier.notify({
        title: `Task Failed [${error.plugin}]`,
        message: `${error.line ? `Line ${error.line}` : ''} ${ error.message }`,
        sound: 'Sosumi'
    });

    const chalk = gutil.colors.white.bgRed;
    let report = `
        ${chalk('TASK:')}: [${error.plugin}]\n
        ${error.line ? `${chalk('Line:')}: ${error.line}\n` : '' }
        ${error.column ? `${chalk('Column:')}: ${error.column}\n` : '' }
        ${chalk('Message:')}: ${error.message}\n
    `;

    console.error(report);

    // Prevent the 'watch' task from stopping
    this.emit('end');
};

// clean
gulp.task('clean', () => {
    return del(config.dest);
});

// templates
gulp.task('templates', () => {
    return gulp.src(config.templates.src)
        .pipe(plumber({errorHandler: reportError}))
        .pipe(nunjucksRender({path: [config.templates.basePath]}))
        .pipe(gulp.dest(config.templates.dest));
});

// scripts
const webpackConfig = webpackConfigWrapper(config);
gulp.task('scripts', ['lint'], () => {
    return gulp.src(config.scripts.src)
        .pipe(gulpWebpack(webpackConfig, webpack, function (error, stats) {
            if (stats.compilation.errors.length) {
                const err = stats.compilation.errors[0].error;
                reportError.call(gulp, {
                    plugin: 'Webpack',
                    line: err.error.loc.line,
                    column: err.error.loc.column,
                    message: err.message
                });
            }
        }))
        .pipe(gulp.dest(config.scripts.dest))
});


// styles
gulp.task('styles', () => {
    const processors = [
        autoprefixer({browsers: config.styles.browsers}),
        cssnano()
    ];
    return gulp.src(config.styles.src)
        .pipe(plumber({errorHandler: reportError}))
        .pipe(gulpif(config.dev, sourcemaps.init()))
        .pipe(sass())
        .pipe(postcss(processors))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(config.styles.dest))
        .pipe(gulpif(config.dev, browserSync.reload({ stream: true })))
});


// lint
gulp.task('lint', () => {
    return gulp.src([config.scripts.watch, 'gulpfile.babel.js'])
        .pipe(eslint())
        .pipe(plumber())
        .pipe(eslint.format())
        .pipe(eslint.results((results) => {
            if (results.warningCount) {
                notifier.notify({
                    title: `${results.warningCount} ESLint warnings found`,
                    message: 'Check the console.',
                    sound: 'Sosumi'
                });
            }
        }))
        .pipe(eslint.failAfterError())
});

// images
gulp.task('images', () => {
    return gulp.src(config.images.src)
        .pipe(imagemin({
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest(config.images.dest));
});

const browserSync = bsCreate();
const reload = (done) => {
    browserSync.reload();
    done();
};
gulp.task('serve', () => {

    // Serve files from the root of this project
    browserSync.init({
        server: {
            baseDir: config.templates.dest
        },
        notify: false,
        logPrefix: 'BrowserSync'
    });

    gulp.task('templates:watch', ['templates'], reload);
    gulp.watch(config.templates.watch, ['templates:watch']);

    gulp.task('styles:watch', ['styles']);
    gulp.watch(config.styles.watch, ['styles:watch']);

    gulp.task('scripts:watch', ['scripts'], reload);
    gulp.watch(config.scripts.watch, ['scripts:watch']);
});

gulp.task('default', ['clean'], () => {
    // define build tasks
    const tasks = [
        'templates',
        'scripts',
        'styles',
        'images'
    ];

    // run build
    runSequence(tasks, () => {
        if (config.dev) {
            gulp.start('serve');
            notifier.notify({
                title: `Build Complete!`,
                message: " ",
                sound: 'Sosumi'
            });
        }
    });
});