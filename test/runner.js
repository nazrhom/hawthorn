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

const tap = require('tap')
const path = require('path')
const packageJSON = require('../package.json')
const hawthorn = require('..')

const testCases = [
  'queryl',
  'rimraf',
  'request',
  'encoding',
  'pareto.js',
  'logform',
  'debug',
  'raven-node',
  'nested-node-modules',
  'import-node-modules-ts',
  'import-directory-ts',
  'package-json-main-directory',
  'package-json-main-extension'
]

for (const testCase of testCases) {
  const expected = require(path.resolve(
    __dirname, 'repos', `${testCase}.json`))
  expected.version = packageJSON.version
  expected.cwd = path.resolve(__dirname, 'repos', testCase)

  tap.test(testCase, async (test) => {
    const result = await hawthorn(expected.paths, {
      directory: expected.cwd
    })

    result.paths = expected.paths
    test.same(result, expected)
  })

  tap.test(`(types=[local]) ${testCase}`, async (test) => {
    const newExpected = {
      version: expected.version,
      cwd: expected.cwd,
      files: {}
    }

    for (const fileName of Object.keys(expected.files)) {
      if (fileName.startsWith('node_modules')) {
        continue
      }

      newExpected.files[fileName] = {}
      if (expected.files[fileName].dynamic) {
        newExpected.files[fileName].dynamic = true
      }

      newExpected.files[fileName].dependencies =
        expected.files[fileName].dependencies.filter((definition) => {
          return definition.type === 'local'
        })
    }

    const result = await hawthorn(expected.paths, {
      directory: expected.cwd,
      types: [ 'local' ]
    })

    test.same(result, newExpected)
  })
}
