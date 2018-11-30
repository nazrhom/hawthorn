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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const path = require('path')
const utils = require('./utils')

module.exports = async (basePath, dependency) => {
  if (dependency.type === 'local') {
    const stat = await utils.stat(dependency.path)
    if (stat && stat.isDirectory()) {
      const packagePath = path.resolve(dependency.path, 'package.json')
      const packageStat = await utils.stat(packagePath)
      if (packageStat) {
        const packageJSON = require(packagePath)
        if (packageJSON.main) {
          if (!path.extname(packageJSON.main)) {
            packageJSON.main += '.js'
          }

          return {
            type: dependency.type,
            path: path.relative(basePath, dependency.path) || '.',
            realpath: path.relative(basePath,
              path.resolve(dependency.path, packageJSON.main))
          }
        }
      }

      const indexPath = path.resolve(dependency.path, 'index.js')
      const indexStat = await utils.stat(indexPath)
      if (indexStat) {
        return {
          type: dependency.type,
          path: path.relative(basePath, dependency.path),
          realpath: path.relative(basePath,
            path.resolve(dependency.path, indexPath))
        }
      }
    }

    if (!stat) {
      const jsPath = `${dependency.path}.js`
      const jsStat = await utils.stat(jsPath)
      if (jsStat) {
        return {
          type: dependency.type,
          path: path.relative(basePath, dependency.path),
          realpath: path.relative(basePath, jsPath)
        }
      }

      const jsonPath = `${dependency.path}.json`
      const jsonStat = await utils.stat(jsonPath)
      if (jsonStat) {
        return {
          type: dependency.type,
          path: path.relative(basePath, dependency.path),
          realpath: path.relative(basePath, jsonPath)
        }
      }
    }

    if (stat && !stat.isDirectory()) {
      return {
        type: dependency.type,
        path: path.relative(basePath, dependency.path),
        realpath: path.relative(basePath, dependency.path)
      }
    }

    throw new Error(`Couldn't resolve ${dependency.path}`)
  }

  const nodePath = path.resolve(basePath, 'node_modules', dependency.path)
  const nodeStat = await utils.stat(nodePath)
  if (nodeStat && nodeStat.isDirectory()) {
    const resolved = await module.exports(basePath, {
      type: 'local',
      path: nodePath
    })

    return {
      type: dependency.type,
      path: dependency.path,
      realpath: resolved.realpath
    }
  }

  if (dependency.path.includes('/')) {
    const filePath = path.extname(dependency.path) ? nodePath : `${nodePath}.js`
    const fileStat = await utils.stat(filePath)

    if (fileStat) {
      return {
        type: dependency.type,
        path: dependency.path,
        realpath: path.relative(basePath, filePath)
      }
    }
  }

  return {
    type: 'internal',
    path: dependency.path,
    realpath: dependency.path
  }
}
