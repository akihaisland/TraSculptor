from Network import PyNetwork
from flask import Flask, jsonify, request, render_template, send_file
from flask_cors import CORS
import copy

app = Flask(__name__)
CORS(app)


def _get_links(network_idx: int):
    """
    Get segment information
    """
    tmpNetwork = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmpNetwork = network_layers[network_idx]
    
    links = []
    link_idx = 0
    for link in tmpNetwork.m_link:
        links.append({
            'ID': link.id,
            'pInNode': link.p_in_node.id,
            'pOutNode': link.p_out_node.id,
            'freeFlowTravelTime': link.free_flow_travel_time,
            'travelTime': link.travel_time,
            'flow': tmpNetwork.links_flow[link_idx],
            'capacity': link.capacity,
            'globalId': link.global_id,
            'originDemand': link.od_demand_satisfied
        })
        link_idx += 1
    return links

def _get_nodes(network_idx: int):
    """
    Get information about a specific network node
    """
    tmpNetwork = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmpNetwork = network_layers[network_idx]

    nodes = []
    for node in tmpNetwork.m_node:
        nodes.append({
            'id': node.id,
            'PositionX': node.position_x,
            'PositionY': node.position_y,
            'lon': node.lon,
            'lat': node.lat,
            'OriginID': node.origin_id,
            'IncomingLink': node.incoming_link,
            'OutgoingLink': node.outgoing_link,
            'globalId': node.global_id,
            'isOd': node.is_od
        })
    return nodes

def _global_info_set(network_idx: int):
    """
    Set global network information (shared node/segment information)
    """
    tmpNetwork = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmpNetwork = network_layers[network_idx]

    # node information
    for i in range(tmpNetwork.m_n_node):
        if tmpNetwork.m_node[i].global_id == -1:
            now_node_info = [tmpNetwork.m_node[i].lat, tmpNetwork.m_node[i].lon]
            try:
                now_global_idx = nodes_global_info.index(now_node_info)
            except ValueError as e:
                # not found
                now_global_idx = len(nodes_global_info)
                nodes_global_info.append(now_node_info)
                tmpNetwork.m_node[i].global_id = now_global_idx
    
    # global_links_flow_scope
    for i in range(tmpNetwork.m_n_link):
        if tmpNetwork.m_link[i].global_id == -1:
            now_link_info = [tmpNetwork.m_link[i].p_in_node.global_id,
                             tmpNetwork.m_link[i].p_out_node.global_id]
            try:
                now_global_idx = links_global_info.index(now_link_info)
                tmpNetwork.m_link[i].global_id = now_global_idx
            except ValueError as e:
                # not found
                now_global_idx = len(links_global_info)
                links_global_info.append(now_link_info)
                tmpNetwork.m_link[i].global_id = now_global_idx

def _update_global_links_info():
    """
    Update global road network information using road information
    """
    global_links_val_scope['fftt'] = [[float('inf'), -1, 0]
                                            for i in range(len(links_global_info))]
    global_links_val_scope['travelTime'] = [[float('inf'), -1, 0]
                                            for i in range(len(links_global_info))]
    global_links_val_scope['speed'] = [[float('inf'), -1, 0]
                                            for i in range(len(links_global_info))]
    global_links_val_scope['flow'] = [[float('inf'), -1, 0]
                                      for i in range(len(links_global_info))]
    global_links_val_scope['capacity'] = [[float('inf'), -1, 0]
                                            for i in range(len(links_global_info))]
    global_links_val_scope['flowRatio'] = [[float('inf'), -1, 0]
                                       for i in range(len(links_global_info))]
    
    global_links_num = [0 for _ in range(len(links_global_info))]
    
    # Traverse the information of each road network
    for network_idx in range(-1, len(network_layers)):
        tmpNetwork = network
        if network_idx >= 0 and network_idx < len(network_layers):
            tmpNetwork = network_layers[network_idx]
        
        for i in range(tmpNetwork.m_n_link):
            global_link_id = tmpNetwork.m_link[i].global_id
            global_links_num[global_link_id] += 1
    
    # Set default values for roads with a count of 0
    for i in range(len(global_links_num)):
        if global_links_num[i] == 0:
            global_links_val_scope['fftt'][i] = [0,0,0]
            global_links_val_scope['travelTime'][i] = [0,0,0]
            global_links_val_scope['speed'][i] = [0,0,0]
            global_links_val_scope['flow'][i] = [0,0,0]
            global_links_val_scope['capacity'][i] = [0,0,0]
            global_links_val_scope['flowRatio'][i] = [0,0,0]

    for network_idx in range(-1, len(network_layers)):
        tmpNetwork = network
        if network_idx >= 0 and network_idx < len(network_layers):
            tmpNetwork = network_layers[network_idx]
        
        for i in range(tmpNetwork.m_n_link):
            global_link_id = tmpNetwork.m_link[i].global_id
            # print(f'global_link_id: {global_link_id}')
            now_link = tmpNetwork.m_link[i]

            # Organize global segment information
            # fftt
            fftt_info = global_links_val_scope['fftt'][global_link_id]
            if now_link.free_flow_travel_time < fftt_info[0]:
                fftt_info[0] = now_link.free_flow_travel_time
            if now_link.free_flow_travel_time > fftt_info[1]:
                fftt_info[1] = now_link.free_flow_travel_time
            fftt_info[2] += now_link.free_flow_travel_time / \
                global_links_num[global_link_id]

            # travel time
            tt_info = global_links_val_scope['travelTime'][global_link_id]
            if now_link.travel_time < tt_info[0]:
                tt_info[0] = now_link.travel_time
            if now_link.travel_time > tt_info[1]:
                tt_info[1] = now_link.travel_time
            tt_info[2] += now_link.travel_time/global_links_num[global_link_id]
            
            # speed
            speed_info = global_links_val_scope['speed'][global_link_id]
            now_speed = now_link.free_flow_travel_time / now_link.travel_time
            if now_speed < speed_info[0]:
                speed_info[0] = now_speed
            if now_speed > speed_info[1]:
                speed_info[1] = now_speed
            speed_info[2] += now_speed / global_links_num[global_link_id]

            # flow
            flow_info = global_links_val_scope['flow'][global_link_id]
            if tmpNetwork.links_flow[i] < flow_info[0]:
                flow_info[0] = tmpNetwork.links_flow[i]
            if tmpNetwork.links_flow[i] > flow_info[1]:
                flow_info[1] = tmpNetwork.links_flow[i]
            flow_info[2] += tmpNetwork.links_flow[i] / \
                global_links_num[global_link_id]

            # capacity
            c_info = global_links_val_scope['capacity'][global_link_id]
            if now_link.capacity < c_info[0]:
                c_info[0] = now_link.capacity
            if now_link.capacity > c_info[1]:
                c_info[1] = now_link.capacity
            c_info[2] += now_link.capacity/global_links_num[global_link_id]

            # flow_ratio
            fr_info = global_links_val_scope['flowRatio'][global_link_id]
            now_fr = tmpNetwork.links_flow[i]/now_link.capacity
            if now_fr < fr_info[0]:
                fr_info[0] = now_fr
            if now_fr > fr_info[1]:
                fr_info[1] = now_fr
            fr_info[2] += now_fr/global_links_num[global_link_id]

    return

@app.route('/network/del')
def del_network_layer():
    """
    delete network layer
    """
    del_origin_idx = eval(request.args.get('originIdx'))
    child_idx = -1
    
    # tmpNetwork = PyNetwork()
    if del_origin_idx < 0 or del_origin_idx >= len(network_layers):
        return jsonify({
            "static": 0,
            "editLogs": network_edits,
            "result": f"network layer id invalid. valid range: [0, {len(network_layers)})",
        })
    else:
        # reset father node
        for i in range(len(network_father)):
            if network_father[i]-1 == del_origin_idx:
                network_father[i] = network_father[del_origin_idx]
                
                # Transfer changes from the parent node to the child nodes
                for j in range(len(network_edits[del_origin_idx])):
                    network_edits[i][j] = network_edits[del_origin_idx][j]

            elif network_father[i]-1 > del_origin_idx:
                network_father[i] -= 1
        network_father.pop(del_origin_idx+1)
        network_layers.pop(del_origin_idx)

        # Modify edit statistics
        network_edits.pop(del_origin_idx)

    return jsonify({
        "static": 1,
        "editLogs": network_edits,
        "result": "success"
    })

@app.route('/network/recursionDel')
def recursion_del_networks_layer():
    """
    recursion-delete network layers
    """
    networks_to_del = eval(request.args.get('networksToDel'))
    # if not isinstance(networks_to_del, list):
    #     networks_to_del = [networks_to_del]
    try:
        networks_to_del = iter(networks_to_del)
    except TypeError:
        networks_to_del = [networks_to_del]
    
    networks_to_del = sorted(networks_to_del)

    # tmpNetwork = PyNetwork()
    for del_origin_idx in networks_to_del[::-1]:
        # del_origin_idx -= 1
        if del_origin_idx < 0 or del_origin_idx >= len(network_layers):
            continue
        else:
            # reset father node
            for i in range(len(network_father)):
                if network_father[i]-1 == del_origin_idx:
                    network_father[i] = network_father[del_origin_idx]
                elif network_father[i]-1 > del_origin_idx:
                    network_father[i] -= 1

            network_father.pop(del_origin_idx+1)
            network_layers.pop(del_origin_idx)
            # Edit modification statistics
            network_edits.pop(del_origin_idx)


    return jsonify({
        "static": 1,
        "result": "success",
        "father_arr": network_father
    })

@app.route('/network/info/all')
def get_all_networks_info():
    """
    Get basic information about all networks
    """
    networks_info = []
    networks_info.append({
        "id": 0,
        "title": network.title,
        "desc": network.desc,
        "father": network_father[0]
    })
    network_idx = 0
    for tmp_network in network_layers:
        network_idx += 1
        networks_info.append({
            "id": network_idx,
            "title": tmp_network.title,
            "desc": tmp_network.desc,
            "father": network_father[network_idx]
        })
    return jsonify(networks_info)

def _get_network_data(network_idx: int):
    """
    Get all data for a specific network
    """
    tmpNetwork = network
    editLog = []
    if network_idx >= 0 and network_idx < len(network_layers):
        tmpNetwork = network_layers[network_idx]
        editLog = network_edits[network_idx]
    else: network_idx = -1

    network_data = {
        "id": network_idx+1,
        "title": tmpNetwork.title,
        "desc": tmpNetwork.desc,
        "father": network_father[network_idx+1],
        "links": _get_links(network_idx),
        "nodes": _get_nodes(network_idx),
        "editLog": editLog,
        "globalNodes": nodes_global_info,
        "globalLinks": links_global_info,
        "globalLinksInfo": global_links_val_scope,
        "avgFlow": tmpNetwork.avg_flow,
        "avgSpeed": tmpNetwork.avg_speed,
        "costSum": tmpNetwork.cost_sum
    }
    return network_data


@app.route('/data/global/all')
def get_global_info():
    """
    Get global information
    """
    # Calculate the range of average flow and average travel time for all networks.
    avg_flows =  [network.avg_flow] + [now_network.avg_flow for now_network in network_layers]
    avg_speeds = [network.avg_speed] + \
        [now_network.avg_speed for now_network in network_layers]
    costs_sum = [network.cost_sum] + \
        [now_network.cost_sum for now_network in network_layers]
    diff_avg_flow = [avg_flows[i]-avg_flows[network_father[i]]
                     for i in range(1, len(network_father))]
    diff_avg_speed = [avg_speeds[i]-avg_speeds[network_father[i]]
                      for i in range(1, len(network_father))]
    diff_cost_sum = [costs_sum[i]-costs_sum[network_father[i]]
                      for i in range(1, len(network_father))]

    min_avg_flow = min(avg_flows)
    max_avg_flow = max(avg_flows)
    all_avg_flow = sum(avg_flows) / len(avg_flows)
    min_avg_speed = min(avg_speeds)
    max_avg_speed = max(avg_speeds)
    all_avg_speed = sum(avg_speeds) / len(avg_speeds)
    min_cost_sum = min(costs_sum)
    max_cost_sum = max(costs_sum)
    avg_cost_sum = sum(costs_sum) / len(costs_sum)

    if len(network_father) > 1:
        min_diff_avg_flow = min(diff_avg_flow)
        max_diff_avg_flow = max(diff_avg_flow)
        min_diff_avg_speed = min(diff_avg_speed)
        max_diff_avg_speed = max(diff_avg_speed)
        min_diff_cost_sum = min(diff_cost_sum)
        max_diff_cost_sum = max(diff_cost_sum)
    else:
        min_diff_avg_flow = 0
        max_diff_avg_flow = 0
        min_diff_avg_speed = 0
        max_diff_avg_speed = 0
        min_diff_cost_sum = 0
        max_diff_cost_sum = 0

    # show all the info
    network_data = {
        "minAvgFlow": min_avg_flow,
        "maxAvgFlow": max_avg_flow,
        "allAvgFlow": all_avg_flow,

        "minAvgSpeed": min_avg_speed,
        "maxAvgSpeed": max_avg_speed,
        "allAvgSpeed": all_avg_speed,

        "minCostsSum": min_cost_sum,
        "maxCostsSum": max_cost_sum,
        "avgCostsSum": avg_cost_sum,

        "minDiffAvgFlow": min_diff_avg_flow,
        "maxDiffAvgFlow": max_diff_avg_flow,
        "minDiffAvgSpeed": min_diff_avg_speed,
        "maxDiffAvgSpeed": max_diff_avg_speed,
        "minDiffCostSum": min_diff_cost_sum,
        "maxDiffCostSum": max_diff_cost_sum,

        "nodesPos": nodes_global_info,
        "linksPos": links_global_info,
        "globalLinksInfo": global_links_val_scope,
        # "linkSortedIdx": linkSortedIdx,
        # "nodesPos": 
    }
    return network_data

@app.route('/data/all')
def get_all_networks_data():
    """
    Get data for all networks
    """
    network_num = len(network_layers)
    networks_data = []
    for i in range(-1, network_num):
        networks_data.append(_get_network_data(network_idx=i))
    return networks_data


@app.route('/data/duplicate')
def duplicate_networks_data():
    """
    Get data for the network and return the network
    """
    copy_origin_idx = eval(request.args.get('originIdx'))
    # set father node
    network_father.append(copy_origin_idx+1)

    tmpNetwork = PyNetwork()
    if copy_origin_idx < 0 or copy_origin_idx >= len(network_layers):
        tmpNetwork = copy.deepcopy(network)
        network_father[-1] = 0
    else:
        tmpNetwork = copy.deepcopy(network_layers[copy_origin_idx])

    tmpNetwork.title += ' copy'
    network_layers.append(tmpNetwork)

    # edit tree
    if copy_origin_idx >= 0 and copy_origin_idx < len(network_layers):
        network_edits.append(copy.deepcopy(network_edits[copy_origin_idx]))
        for network_edit_info in network_edits[-1]:
            network_edit_info['edit_on_this'] = False
    else:
        network_edits.append([])

    _global_info_set(len(network_layers)-1)
    return jsonify(_get_network_data(network_idx=len(network_father)-2))


@app.route('/data/newLink')
def new_network_link():
    """
    new a road
    """
    network_idx = eval(request.args.get('networkIdx'))
    start_pt_id = eval(request.args.get('startPtId'))
    end_pt_id = eval(request.args.get('endPtId'))
    capacity = eval(request.args.get('capacity'))
    free_flow_travel_time = eval(request.args.get('freeFlowTravelTime'))
    i_capacity = eval(request.args.get('iCapacity'))
    i_free_flow_travel_time = eval(request.args.get('iFreeFlowTravelTime'))
    i_exist = request.args.get('iExist') == 'true'
    

    tmp_network = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmp_network = network_layers[network_idx]

    link_id1, new_edits1 = tmp_network.add_link(start_pt_id, end_pt_id, capacity, free_flow_travel_time, False)
    if i_exist:
        link_id2, new_edits2 = tmp_network.add_link(end_pt_id, start_pt_id, i_capacity, i_free_flow_travel_time)
        new_edits1 = list(set(new_edits1).union(new_edits2))
    else:
        tmp_network.compute_path_bfs()
        
    tmp_network.LogitSUE()

    # Modify the edit tree.
    for new_edit_type in new_edits1:
        network_edits[network_idx].append(
            {"edit_type": new_edit_type, "edit_on_this": True})

    _global_info_set(network_idx)
    _update_global_links_info()
    return jsonify(_get_network_data(network_idx))

@app.route('/data/delLink')
def del_network_link():
    """
    delete a road
    """
    network_idx = eval(request.args.get('networkIdx'))
    links_to_del = eval(request.args.get('linksIdx'))

    tmp_network = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmp_network = network_layers[network_idx]

    if type(links_to_del) == int:
        tmp_network.del_link([links_to_del])
    else:
        tmp_network.del_link(links_to_del)
    tmp_network.LogitSUE()

    # Modify the edit tree
    network_edits[network_idx].append({"edit_type": 6, "edit_on_this": True})

    _update_global_links_info()
    return jsonify(_get_network_data(network_idx))


@app.route('/data/newNode')
def new_network_node():
    """
    new a node (intersection)
    """
    network_idx = eval(request.args.get('networkIdx'))
    node_lat = eval(request.args.get('nodeLat'))
    node_lng = eval(request.args.get('nodeLng'))
    former_link_a_id = eval(request.args.get('formerLinkA'))
    linka_fftt = eval(request.args.get('aFFTT'))
    former_link_b_id = eval(request.args.get('formerLinkB'))
    linkb_fftt = eval(request.args.get('bFFTT'))

    tmp_network = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmp_network = network_layers[network_idx]

    add_node_res = tmp_network.add_node(node_lat, node_lng, former_link_a_id,
                         linka_fftt, former_link_b_id, linkb_fftt)

    former_cost = tmp_network.cost_sum
    tmp_network.LogitSUE()
    if not add_node_res:
        tmp_network.cost_sum = former_cost

    # Modify the edit tree
    network_edits[network_idx].append({"edit_type": 3, "edit_on_this": True})

    _global_info_set(network_idx)
    _update_global_links_info()
    return jsonify(_get_network_data(network_idx))


@app.route('/data/delNode')
def del_network_node():
    """
    delete a node
    """
    network_idx = eval(request.args.get('networkIdx'))
    node_to_del = eval(request.args.get('nodeIdx'))

    tmp_network = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmp_network = network_layers[network_idx]

    res = tmp_network.del_node(node_to_del)
    if res:
        tmp_network.LogitSUE()

        # Modify the edit tree
        network_edits[network_idx].append({"edit_type": 4, "edit_on_this": True})

        _update_global_links_info()
    return jsonify(_get_network_data(network_idx))


@app.route('/data/linkReset')
def reset_network_link():
    """
    edit attribute of a road
    """
    network_idx = eval(request.args.get('networkIdx'))
    link_idx = eval(request.args.get('linkIdx'))
    new_free_flow_travel_time = eval(request.args.get('freeFlowTravelTime'))
    new_capacity = eval(request.args.get('capacity'))

    tmp_network = network
    if network_idx >= 0 and network_idx < len(network_layers):
        tmp_network = network_layers[network_idx]
    
    # Modify road attributes
    res1 = tmp_network.change_link_free_travel_time(link_idx, new_free_flow_travel_time)
    if res1 >= 1:
        network_edits[network_idx].append(
            {"edit_type": res1, "edit_on_this": True})
        print(f"res: {res1}")
    
    res2 = tmp_network.change_link_capcity(link_idx, new_capacity)
    if res2 >= 1:
        network_edits[network_idx].append(
            {"edit_type": res2, "edit_on_this": True})
        print(f"res: {res2}")
    
    if res1 >= 1 or res2 >= 1:
        tmp_network.LogitSUE()
    _update_global_links_info()
    return jsonify(_get_network_data(network_idx))


@app.route('/network/switchPos')
def switch_network_layer_pos():
    """
    Modify the network ID
    """
    network_idx = eval(request.args.get('networkIdx'))
    target_network_idx = eval(request.args.get('targetNetworkIdx'))

    if network_idx < 0 or target_network_idx < 0:
        return jsonify({
            "static": 0,
            "fatherArr": network_father,
            "editLogs": network_edits
        })

    # Modify the parent node to prevent it from appearing before the parent node
    while network_father[network_idx+1]-1 >= target_network_idx:
        network_father[network_idx +
                       1] = network_father[network_father[network_idx+1]]
        
    # Modify the edit log
    now_fa_idx = network_father[network_idx+1] - 1
    for i in range(len(network_edits[now_fa_idx]), len(network_edits[network_idx])):
        network_edits[network_idx]['edit_on_this'] = True
    
    # Modify location
    network_to_switch = network_layers.pop(network_idx)
    network_layers.insert(target_network_idx, network_to_switch)
    
    return jsonify({
        "static": 1,
        "fatherArr": network_father,
        "editLogs": network_edits
    })



if __name__ == '__main__':
    network_layers = []
    network_father = [-1]

    # Global node and segment information.
    nodes_global_info = []
    links_global_info = []
    global_links_val_scope = {"fftt": [], "travelTime": [], "speed":[], "capacity": [], "flow": [], "flowRatio": []}

    # edit_type 
    # 1Increase capacity 2Decrease capacity 3Create a new node 4Delete a node 5Create a new road 6Delete a road 7Decrease fftt 8Increase fftt
    # edit_on_this Whether to modify on this network
    network_edits = []
    # network_edit_details = [] # {"edit_links_len", "close_links_len", "new_tunnels_len"}

    # Initialize the Net 
    network = PyNetwork()
    # data_path = "mini_data" # mini batch data for case study
    # data_path = "data" # SiouxFalls dataset
    data_path = "ema_data" # ema dataset

    # Update the file paths to your data files
    network.read_node(f"{data_path}/Nodes.txt")
    network.read_link(f"{data_path}/Links.txt")
    network.read_od_pairs(f"{data_path}/ODPairs.txt")
    network.compute_path_bfs()

    # Run the solution algorithm
    network.LogitSUE()
    _global_info_set(-1)
    _update_global_links_info()

    # Run backend
    app.run(debug=True,port=8081)
