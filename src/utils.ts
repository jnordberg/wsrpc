/**
 * @file Misc utility functions.
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license
 * Copyright (c) 2017 Johan Nordberg. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *  1. Redistribution of source code must retain the above copyright notice, this
 *     list of conditions and the following disclaimer.
 *
 *  2. Redistribution in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *
 *  3. Neither the name of the copyright holder nor the names of its contributors
 *     may be used to endorse or promote products derived from this software without
 *     specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * You acknowledge that this software is not designed, licensed or intended for use
 * in the design, construction, operation or maintenance of any military facility.
 */

import {EventEmitter} from 'events'
import {Namespace, ReflectionObject, Service} from 'protobufjs'

/**
 * Return a promise that will resove when a specific event is emitted.
 */
export function waitForEvent<T>(emitter: EventEmitter, eventName: string|symbol): Promise<T> {
    return new Promise((resolve, reject) => {
        emitter.once(eventName, resolve)
    })
}

/**
 * Resolve full name of protobuf objects.
 * This helps to distinguish services or methods with the same name but in different packages/namespaces.
 *
 * Example returns:
 * 'packageName.serviceName.methodName'
 * 'differentPackageName.serviceName.methodName'
 */
export function getFullName(obj: ReflectionObject, names: string[] = []): string {
    if (obj.name) {
        names.unshift(obj.name)
    }

    if (obj.parent) {
        return getFullName(obj.parent, names)
    }

    return names.join('.')
}

/**
 * Get all protobuf.Service in a protobuf.ReflectionObject.
 * returns with an array of fully namespaced services.
 *
 * Example return:
 * ['packageName.serviceName.methodName', 'differentPackageName.serviceName.methodName']
 */
export function lookupServices(obj: ReflectionObject): string[] {
    const services: string[] = []

    if (obj instanceof Service) {
        services.push(getFullName(obj))
    }

    if (obj instanceof Namespace) {
        obj.nestedArray.forEach((nestedObject: ReflectionObject) => {
            services.push(...lookupServices(nestedObject))
        })
    }

    return services
}
