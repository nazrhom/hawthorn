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
 *     # derived from this software without specific prior written permission.
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
const utils = require('./utils')
const ast = require('./ast')
const resolver = require('./resolver')
const packageJSON = require('../package.json')

const processFile = async (basePath, file, output) => {
  output.files[file] = output.files[file] || {
    dependencies: []
  }

  const filePath = path.resolve(basePath, file)
  const contents = await utils.readFile(filePath)
  const dependencies = ast.getDependencies(filePath, contents)
  const result = await utils.mapAsync(
    dependencies, resolver.bind(null, basePath))

  for (const dependency of result) {
    const hasElement = output.files[file].dependencies.find((element) => {
      return element.type === dependency.type &&
        element.path === dependency.path &&
        element.realpath === dependency.realpath
    })

    if (!hasElement) {
      output.files[file].dependencies.push(dependency)
    }

    if (!output.files[dependency.realpath] &&
        dependency.type !== 'internal' &&
        dependency.realpath) {
      await processFile(basePath, dependency.realpath, output)
    }
  }
}

module.exports = async (paths, options) => {
  const cwd = path.resolve(options.directory)
  const output = {
    cwd,
    version: packageJSON.version,
    files: {}
  }

  const files = await utils.resolvePaths(paths, { cwd })
  for (const file of files) {
    await processFile(cwd, file, output)
  }

  return output
}
