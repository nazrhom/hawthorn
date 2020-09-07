/* Copyright (c) 2018, Juan Cruz Viotti
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

const path = require('path')
const esprimaWalk = require('esprima-walk')
const recast = require('recast')
const babelParser = require('@babel/parser')
const esprima = require('./esprima')
const packageJSON = require('../package.json')
const debug = require('debug')(`${packageJSON.name}:debug`)

const parseScript = (filePath, string) => {
  try {
    return esprima.parseScript(string, {
      tolerant: true,
      jsx: true
    })
  } catch (error) {
    error.name = 'ParseError'
    error.file = filePath
    throw error
  }
}

exports.getDependencies = (filePath, string, options = {}) => {
  if (options.log) {
    console.error(`Parsing ${filePath}`)
  }

  const extension = path.extname(filePath)

  if (extension === '.json') {
    debug('File is json. Returning early')
    return {
      dynamic: false,
      content: []
    }
  }

  let dynamic = false
  const dependencies = []
  const scope = {}

  // To handle shebang
  // See https://esprima.readthedocs.io/en/4.0/syntactic-analysis.html
  const safeString = string.replace(/(^#!.*)/, (match) => {
    return Array(match.length + 1).join(' ')
  })

  if (extension === '.ts' || extension === '.tsx') {
    const ast = recast.parse(string, {
      parser: {
        parse (source, parseOptions) {
          // See https://github.com/benjamn/recast/blob/master/parsers/babel.js
          const babelOptions =
            require('recast/parsers/_babel_options')(parseOptions)
          babelOptions.plugins.push('jsx', 'typescript')
          return babelParser.parse(source, babelOptions)
        }
      }
    })

    recast.visit(ast, {
      visitImportDeclaration (node) {
        const argument = node.value.source

        if (argument.value.startsWith('.')) {
          dependencies.push({
            type: 'local',
            path: path.join(path.dirname(filePath), argument.value)
          })
        } else {
          dependencies.push({
            type: 'module',
            path: argument.value
          })
        }

        this.traverse(node)
      },
      visitCallExpression (node) {
        if (node.value.callee.name === 'require' && node.value.arguments[0]) {
          const argument = node.value.arguments[0]
          if (argument.value.startsWith('.')) {
            dependencies.push({
              type: 'local',
              path: path.join(path.dirname(filePath), argument.value)
            })
          } else {
            dependencies.push({
              type: 'module',
              path: argument.value
            })
          }
        }

        this.traverse(node)
      }
    })

    return {
      dynamic,
      content: dependencies
    }
  }

  esprimaWalk(parseScript(filePath, safeString), (node) => {
    if (node &&
        node.type === 'AssignmentExpression' &&
        node.left.type === 'Identifier' &&
        node.right.type === 'Literal') {
      scope[node.left.name] = node.right.value
    }

    if (node &&
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length > 0) {
      const argument = node.arguments[0]

      if (argument.type === 'Identifier' && scope[argument.name]) {
        argument.type = 'Literal'
        argument.value = scope[argument.name]
      }

      if (argument.type !== 'Literal') {
        if (options.log) {
          console.error(`Dynamic: ${filePath}`)
        }

        dynamic = true
        return
      }

      if (argument.value.startsWith('.')) {
        dependencies.push({
          type: 'local',
          path: path.join(path.dirname(filePath), argument.value)
        })
      } else {
        dependencies.push({
          type: 'module',
          path: argument.value
        })
      }
    }
  })

  return {
    dynamic,
    content: dependencies
  }
}
