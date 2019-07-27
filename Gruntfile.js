/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
'use strict';

module.exports = function(grunt) {

  require('coffee-errors');

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.loadNpmTasks('grunt-notify');

  grunt.registerTask('test',    [ 'coffeelint', 'simplemocha' ]);
  grunt.registerTask('default', [ 'test', 'watch' ]);

  return grunt.initConfig({

    coffeelint: {
      options: {
        max_line_length: {
          value: 0
        },
        indentation: {
          value: 2
        },
        newlines_after_classes: {
          level: 'error'
        },
        no_empty_param_list: {
          level: 'error'
        },
        no_unnecessary_fat_arrows: {
          level: 'ignore'
        }
      },
      dist: {
        files: {
          src: [
            '**/*.coffee',
            '!node_modules/**'
          ]
        }
      }
    },

    simplemocha: {
      options: {
        ui: 'bdd',
        reporter: 'spec',
        compilers: 'coffee:coffee-script',
        ignoreLeaks: false
      },
      dist: {
        src: [ 'tests/test_*.coffee' ]
      }
    },

    watch: {
      options: {
        interrupt: true
      },
      dist: {
        files: [
          '**/*.{coffee,js}',
          '!node_modules/**'
        ],
        tasks: [ 'test' ]
      }
    }});
};
