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
const builtinModules = require('builtin-modules')
const utils = require('./utils')
const packageJSON = require('../package.json')
const warning = require('debug')(`${packageJSON.name}:warn`)

const setExtension = (filePath, extension) => {
  if (path.extname(filePath) === `.${extension}`) {
    return filePath
  }

  return `${filePath}.${extension}`
}

const setDefaultExtension = (filePath, extension) => {
  if (!path.extname(filePath)) {
    return setExtension(filePath, extension)
  }

  return filePath
}

const getPackageMain = (packagePath) => {
  const manifest = require(packagePath)
  if (!manifest.main) {
    return null
  }

  return manifest.main
}

const getRelativeDependencyEntry = (basePath, dependencyEntry) => {
  return {
    type: dependencyEntry.type,
    path: path.relative(basePath, dependencyEntry.path) || '.',
    realpath: path.relative(basePath, dependencyEntry.realpath),
    basepath: dependencyEntry.basepath
  }
}

const tryFileExtensions = async (filePath, extensions) => {
  for (const extension of extensions) {
    const fullPath = `${filePath}.${extension}`
    if (await utils.isFile(fullPath)) {
      return fullPath
    }
  }

  return null
}

const requireDirectory = async (directory) => {
  for (const file of [ 'index.js' ]) {
    const fullPath = path.resolve(directory, file)
    if (!await utils.isFile(fullPath)) {
      continue
    }

    return fullPath
  }

  return null
}

module.exports = async (basePath, packagePath, dependency) => {
  if (dependency.type === 'local') {
    if (await utils.isDirectory(dependency.path)) {
      const manifestPath = path.resolve(dependency.path, 'package.json')
      if (await utils.stat(manifestPath)) {
        const main = getPackageMain(manifestPath)
        if (main) {
          const fullPath = path.resolve(dependency.path, main)

          if (await utils.isDirectory(fullPath)) {
            const realPath = await requireDirectory(fullPath)
            if (realPath) {
              return getRelativeDependencyEntry(basePath, {
                type: dependency.type,
                path: dependency.path,
                realpath: realPath,
                basepath: dependency.path
              })
            }
          }

          return getRelativeDependencyEntry(basePath, {
            type: dependency.type,
            path: dependency.path,
            realpath: setExtension(fullPath, 'js'),
            basepath: dependency.path
          })
        }
      }

      const realPath = await requireDirectory(dependency.path)
      if (realPath) {
        return getRelativeDependencyEntry(basePath, {
          type: dependency.type,
          path: dependency.path,
          realpath: realPath,
          basepath: dependency.path
        })
      }
    }

    if (await utils.isFile(dependency.path)) {
      return {
        type: dependency.type,
        path: path.relative(basePath, dependency.path),
        realpath: path.relative(basePath, dependency.path),
        basepath: basePath
      }
    }

    const fullPath = await tryFileExtensions(dependency.path, [ 'js', 'json' ])
    if (fullPath) {
      return getRelativeDependencyEntry(basePath, {
        type: dependency.type,
        path: dependency.path,
        realpath: fullPath,
        basepath: basePath
      })
    }

    throw new Error(`Couldn't resolve ${dependency.path}`)
  }

  const search = async (currentSearchPath) => {
    const currentNodePath = path.resolve(
      currentSearchPath, 'node_modules', dependency.path)
    if (await utils.isDirectory(currentNodePath)) {
      const resolved = await module.exports(basePath, currentSearchPath, {
        type: 'local',
        path: currentNodePath
      })

      return {
        type: dependency.type,
        path: dependency.path,
        realpath: resolved.realpath,
        basepath: resolved.basepath
      }
    }

    if (dependency.path.includes('/')) {
      const filePath = setDefaultExtension(currentNodePath, 'js')
      if (await utils.stat(filePath)) {
        return {
          type: dependency.type,
          path: dependency.path,
          realpath: path.relative(basePath, filePath),
          basepath: basePath
        }
      }
    }

    const newSearchPath = path.dirname(currentSearchPath)
    if (newSearchPath.indexOf(basePath) === 0) {
      return search(newSearchPath)
    }

    return null
  }

  const searchResult = await search(packagePath)
  if (searchResult) {
    return searchResult
  }

  if (builtinModules.includes(dependency.path)) {
    return {
      type: 'internal',
      path: dependency.path,
      realpath: dependency.path,
      basepath: basePath
    }
  }

  warning(`Unresolved module: ${dependency.path}`)
  return {
    type: 'module',
    path: dependency.path,
    basepath: basePath,
    realpath: null
  }
}
