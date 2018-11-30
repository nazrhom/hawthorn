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

const fs = require('fs')
const path = require('path')
const utils = require('./utils')

module.exports = async (dependency) => {
  const stat = await utils.stat(dependency)
  if (stat && stat.isDirectory()) {
    const packageJSONPath = path.resolve(dependency, 'package.json')
    const packageJSONStat = await utils.stat(packageJSONPath)
    if (packageJSONStat) {
      const packageJSON = require(packageJSONPath)
      const fullPath = path.extname(packageJSON.main)
        ? packageJSON.main
        : packageJSON.main + '.js'
      return path.resolve(dependency, fullPath)
    }

    const indexPath = path.resolve(dependency, 'index.js')
    const indexStat = await utils.stat(indexPath)
    if (indexStat) {
      return path.resolve(dependency, indexPath)
    }
  }

  const extendedPath = dependency + '.js'
  const extendedStat = await utils.stat(extendedPath)
  if (extendedStat) {
    return extendedPath
  }

  throw new Error(`Couldn't resolve ${dependency}`)
}
