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

const fs = require('fs')
const glob = require('glob')

exports.promisify = async (fn) => {
  return new Promise((resolve, reject) => {
    fn((error, result) => {
      if (error) {
        return reject(error)
      }

      return resolve(result)
    })
  })
}

// Negation happens according to this spec:
// https://gulpjs.com/docs/en/getting-started/explaining-globs#special-character-negative
exports.resolvePaths = async (paths, options) => {
  const result = new Set()

  for (const segment of paths) {
    const negation = segment.startsWith('!')
    const pattern = negation ? segment.substring(1) : segment

    const expansions = await exports.promisify((callback) => {
      glob(pattern, {
        nodir: true,
        cwd: options.cwd
      }, callback)
    })

    for (const expansion of expansions) {
      if (negation) {
        result.delete(expansion)
      } else {
        result.add(expansion)
      }
    }
  }

  return result
}

exports.stat = async (filePath) => {
  return exports.promisify((callback) => {
    fs.stat(filePath, (error, stat) => {
      if (error && error.code === 'ENOENT') {
        return callback(null, null)
      }

      return callback(error, stat)
    })
  })
}

exports.isDirectory = async (filePath) => {
  const stat = await exports.stat(filePath)
  if (!stat) {
    return false
  }

  return stat.isDirectory()
}

exports.isFile = async (filePath) => {
  const stat = await exports.stat(filePath)
  if (!stat) {
    return false
  }

  return stat.isFile()
}

exports.mapAsync = async (set, mapper) => {
  const result = []

  for (const element of set) {
    result.push(await mapper(element))
  }

  return result
}

exports.readFile = async (filePath) => {
  return exports.promisify((callback) => {
    fs.readFile(filePath, 'utf8', callback)
  })
}
