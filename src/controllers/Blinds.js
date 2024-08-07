// Blinds/Shutters Controller
module.exports = function () {
        this.storedBlinds = []

        this.init = function (freeboxRequest) {
                this.freeboxRequest = freeboxRequest
                this.getBlinds((blinds) => {
                        this.storedBlinds = blinds
                        if (blinds != null) {
                                console.log('[d] found ' + this.storedBlinds.length + ' blinds')
                        } else {
                                console.log('[d] no blinds foudn ?!')
                        }
                })
        }

        this.getBlinds = function (callback) {
                let url = 'http://mafreebox.freebox.fr/api/v8/home/nodes'
                let storedBlinds = []
                this.freeboxRequest.request('GET', url, null, (statusCode, body) => {
                        if (statusCode != 200) {
                                console.log('[d] received error ' + statusCode + ' to ' + url)
                                callback(null)
                        }
                        if (body != null) {
                                if (body.success == true) {
                                        for (node of body.result) {
                                                if (node.category == 'shutter') {
                                                        let o = {
                                                                'nodeid': node.id,
                                                                'displayName': node.label,
                                                                'endpoints': node.show_endpoints,
                                                                'current_position': null
                                                        }
                                                        console.log('[d] found store/shutter=' + o.nodeid + '->' + o.displayName)
                                                        // console.log(JSON.stringify(node))
                                                        storedBlinds.push(o)
                                                }
                                        }
                                } else {
                                        console.log('[!] Got a ' + statusCode + ', unable to request : ' + url)
                                        console.log(body)
                                        callback(null)
                                }
                        } else {
                                console.log('[!] Got a ' + statusCode + ', unable to request : ' + url)
                                callback(null)
                        }
                        callback(storedBlinds)
                }, true)
        }

        this.getEndPointIdWithName = function (blind, name, rw_status) {
                //console.log('Blinds -> getEndPointIdWithName -> blind =' + JSON.stringify(blind) + ' search=' + name + ' with rw status' + rw_status)
                if (blind != null) {
                        var id = 0
                        for (endpoint of blind.endpoints) {
                                if (endpoint.name == name) {
                                        if (endpoint.ui.access == rw_status) {
                                                console.log('Blinds -> getEndPointIdWithName -> FOUND ! (endpoint id=' + endpoint.id + ')')
                                                return endpoint.id
                                        }
                                } else {
                                        id++
                                }
                        }
                }
                console.log('Blinds -> getEndPointIdWithName -> NOT FOUND ?!')
                return null
        }


        this.getBlindCurentPosition = function (blind_index, callback) {
                console.log('Blinds -> getBlindCurentPosition -> blind index=' + blind_index)
                if (blind_index >= 0 && blind_index < this.storedBlinds.length) {
                        let blind = this.storedBlinds[blind_index]
                        let node_id = blind.nodeid
                        let ep_id = null
                        let expected_end_point_name = 'position_set'
                        ep_id = this.getEndPointIdWithName(blind, expected_end_point_name, 'r')
                        if (ep_id != null) {
                                let url = 'http://mafreebox.freebox.fr/api/v8/home/endpoints/' + node_id + '/' + ep_id
                                this.freeboxRequest.request('GET', url, null, (statusCode, body) => {
                                        if (body != null) {
                                                if (body.success == true) {
                                                        let val = body.result.value
                                                        blind.current_position = val
                                                        console.log('Blinds ->blind=' + blind.displayName + ' nodeid=' + node_id + '-> Request success ! ' + url)
                                                        console.log('Blinds ->' + JSON.stringify(body.result))
                                                        console.log('Blinds ->current value=' + val)
                                                        callback({ value: blind.current_position })
                                                } else {
                                                        console.log('Blinds ->blind=' + blind.displayName + ' nodeid=' + blind.nodeid + '-> Request failed ... ' + url + ' statusCode=' + statusCode)
                                                        callback('Failed to get position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') statusCode=' + statusCode)
                                                }
                                        } else {
                                                callback('Failed to send get position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') => no body response')
                                        }
                                }, true)
                        } else {
                                console.log('[d] expected endpoint with name=' + expected_end_point_name + ' not found...')
                                callback('Failed to get position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ') No valid endpointid found (expected=' + expected_end_point_name + ')')
                        }
                } else {
                        console.log('[d] blind index not found: ' + blind_index)
                        callback('Failed to get position ' + value + ' to blind index ' + blind_index + ' : index out of bounds (' + this.storedBlinds.length + ' blinds found so far)')
                }
        }

        this.setBlindPosition = function (blind_index, value, callback) {
                console.log('[d] Blinds -> setBlindPosition -> blind index=' + blind_index + ' -> pos=' + value)
                if (blind_index >= 0 && blind_index < this.storedBlinds.length) {
                        let blind = this.storedBlinds[blind_index]
                        console.log('[d] Blinds -> setBlindPosition -> blind=' + blind.displayName + ' nodeid=' + blind.nodeid)
                        let node_id = blind.nodeid
                        let ep_id = null
                        let expected_end_point_name = 'position_set'
                        ep_id = this.getEndPointIdWithName(blind, expected_end_point_name, 'w')
                        console.log('[d] Blinds -> setBlindPosition -> blind node id=' + node_id + ' -> endpoint id=' + ep_id)
                        //if (node_id != null) {
                        if (ep_id != null) {
                                let url = 'http://mafreebox.freebox.fr/api/v8/home/endpoints/' + node_id + '/' + ep_id
                                let data = {
                                        'value': value
                                }
                                // console.log('Blinds -> Freebox request url=' + url)
                                // console.log('Blinds -> Freebox request data=' + JSON.stringify(data))
                                this.freeboxRequest.request('PUT', url, data, (statusCode, body) => {
                                        if (body != null) {
                                                if (body.success == true) {
                                                        console.log('[d] Blinds -> setBlindPosition -> blind=' + blind.displayName + ' nodeid=' + node_id + '-> Request success ! ' + url)
                                                        callback('Successfully sent set position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ')')
                                                } else {
                                                        console.log('[d] Blinds -> setBlindPosition -> blind=' + blind.displayName + ' nodeid=' + blind.nodeid + '-> Request failed ... ' + url + ' statusCode=' + statusCode)
                                                        callback('Failed to send set position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') statusCode=' + statusCode)
                                                }
                                        } else {
                                                callback('Failed to send set position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') => no body response')
                                        }
                                }, true)
                        } else {
                                console.log('[d] Blinds -> setBlindPosition -> expected endpoint with name=' + expected_end_point_name + ' not found...')
                                callback('Failed to send set position ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ') No valid endpointid found (expected=' + expected_end_point_name + ')')
                        }
                } else {
                        console.log('[d] Blinds -> setBlindPosition -> blind index not found: ' + blind_index)
                        callback('Failed to send set position ' + value + ' to blind index ' + blind_index + ' : index out of bounds (' + this.storedBlinds.length + ' blinds found so far)')
                }
        }

        this.stopBlind = function (blind_index, callback) {
                console.log('[d] Blinds -> stopBlind -> blind index=' + blind_index)
                if (blind_index >= 0 && blind_index < this.storedBlinds.length) {
                        let blind = this.storedBlinds[blind_index]
                        let node_id = blind.nodeid
                        let ep_id = null
                        let expected_end_point_name = 'stop'
                        ep_id = this.getEndPointIdWithName(blind, expected_end_point_name, 'w')
                        if (ep_id != null) {
                                let url = 'http://mafreebox.freebox.fr/api/v8/home/endpoints/' + node_id + '/' + ep_id
                                let data = {
                                        "value": true
                                }
                                this.freeboxRequest.request('PUT', url, data, (statusCode, body) => {
                                        if (body != null) {
                                                if (body.success == true) {
                                                        console.log('[d] Blinds -> stopBlind -> blind=' + blind.displayName + ' nodeid=' + node_id + '-> Request success ! ' + url)
                                                        callback('Successfully sent stop command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ')')
                                                } else {
                                                        console.log('[d] Blinds -> stopBlind -> blind=' + blind.displayName + ' nodeid=' + blind.nodeid + '-> Request failed ... ' + url + ' statusCode=' + statusCode)
                                                        callback('Failed to send stop command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') statusCode=' + statusCode)
                                                }
                                        } else {
                                                callback('Failed to send stop command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') => no body response')
                                        }
                                }, true)
                        } else {
                                console.log('[d] Blinds -> stopBlind -> expected endpoint with name=' + expected_end_point_name + ' not found...')
                                callback('Failed to send stop command to blind ' + blind.displayName + '(nodeid=' + node_id + ') No valid endpointid found (expected=' + expected_end_point_name + ')')
                        }
                } else {
                        console.log('[d] Blinds -> stopBlind -> blind index not found: ' + blind_index)
                        callback('Failed to send stop command to blind index ' + blind_index + ' : index out of bounds (' + this.storedBlinds.length + ' blinds found so far)')
                }
        }

        this.toggleBlind = function (blind_index, callback) {
                console.log('[d] Blinds -> toggleBlind -> blind index=' + blind_index)
                if (blind_index >= 0 && blind_index < this.storedBlinds.length) {
                        let blind = this.storedBlinds[blind_index]
                        let node_id = blind.nodeid
                        let ep_id = null
                        let expected_end_point_name = 'toggle'
                        ep_id = this.getEndPointIdWithName(blind, expected_end_point_name, 'w')
                        if (ep_id != null) {
                                let url = 'http://mafreebox.freebox.fr/api/v8/home/endpoints/' + node_id + '/' + ep_id
                                let data = {
                                        "value": true
                                }
                                this.freeboxRequest.request('PUT', url, data, (statusCode, body) => {
                                        if (body != null) {
                                                if (body.success == true) {
                                                        console.log('[d] Blinds ->blind=' + blind.displayName + ' nodeid=' + node_id + '-> Request success ! ' + url)
                                                        callback('Successfully sent toggle command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ')')
                                                } else {
                                                        console.log('[d] Blinds ->blind=' + blind.displayName + ' nodeid=' + blind.nodeid + '-> Request failed ... ' + url + ' statusCode=' + statusCode)
                                                        callback('Failed to send toggle command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') statusCode=' + statusCode)
                                                }
                                        } else {
                                                callback('Failed to send toggle command to blind ' + blind.displayName + '(nodeid=' + node_id + ', endpointid=' + ep_id + ') => no body response')
                                        }
                                }, true)
                        } else {
                                console.log('[d] expected endpoint with name=' + expected_end_point_name + ' not found...')
                                callback('Failed to send toggle command ' + value + ' to blind ' + blind.displayName + '(nodeid=' + node_id + ') No valid endpointid found (expected=' + expected_end_point_name + ')')
                        }
                } else {
                        console.log('[d] blind index not found: ' + blind_index)
                        callback('Failed to send toggle command ' + value + ' to blind index ' + blind_index + ' : index out of bounds (' + this.storedBlinds.length + ' blinds found so far)')
                }
        }

        this.openBlind = function (blind_index, callback) {
                this.setBlindPosition(blind_index, 0, callback)
        }

        this.closeBlind = function (blind_index, callback) {
                this.setBlindPosition(blind_index, 100, callback)
        }
}
