import math
import time
import os
import numpy as np
import tqdm

class PyNode:
    """
    Node

    Attributes:
        - id: The node's ID, starting from zero;
        - position_x: The X coordinate of the node;
        - position_y: The Y coordinate of the node;
        - origin_id: The ID of the corresponding origin node, -1 indicates it is not an origin;
        - incoming_link: Set of segment IDs that enter the node;
        - outgoing_link: Set of segment IDs that leave the node;

        - global_id: A unique ID across all global networks
        - is_od: Whether it is part of an OD pair
        - lon: Longitude
        - lat: Latitude
        - binary_ways: Whether it can only lead to two nodes
    """
    def __init__(self) -> None:
        self.id = 0  # The node's ID, starting from 0
        self.position_x = 0.0  # The X coordinate of the node
        self.position_y = 0.0  # The Y coordinate of the node
        # The ID of the corresponding origin node, -1 indicates it is not an origin
        self.origin_id = -1
        self.incoming_link = []  # Set of segment IDs that enter the node
        self.outgoing_link = []  # Set of segment IDs that leave the node

        # Longitude and Latitude
        self.lon = 0  # Longitude
        self.lat = 0  # Latitude

        # Global ID
        self.global_id = -1
        self.is_od = False
        self.binary_ways = True


class PyLink:
    """
    Segment

    Attributes:
        - id: The segment's ID, starting from zero
        - p_in_node: The starting node of the segment
        - p_out_node: The ending node of the segment
        - free_flow_travel_time: Free flow travel time
        - travel_time: Travel time
        - capacity: The capacity of the segment
        - alpha: BPR function parameter, typically set to 0.15
        - power: BPR function parameter, typically set to 4.0
        - od_demand_satisfied: Demand satisfied for OD pairs, an array containing the total demand satisfied for each node as origin and destination
        - global_id: A unique ID across all global networks
    """
    def __init__(self) -> None:
        self.id = 0  # The segment's ID, starting from zero
        self.p_in_node = None  # The starting node of the segment
        self.p_out_node = None  # The ending node of the segment
        self.free_flow_travel_time = 0.0  # Free flow travel time
        self.travel_time = 0.0  # Travel time
        self.capacity = 0.0  # The capacity of the segment
        self.alpha = 0.15  # BPR function parameter, typically set to 0.15
        self.power = 4.0  # BPR function parameter, typically set to 4.0

        self.global_id = -1
        self.od_demand_satisfied = []

class PyODPairs:
    """
    OD Pairs

    - Attributes:
        - id: The node's ID, starting from zero
        - p_od_node: List of OD pair starting and ending points [O, D]
        - od_demand: OD demand
        - m_n_od_path: Number of paths between OD pairs
        - p_od_path: Set of paths between OD pairs
        - choice_prob: Probability of all paths being chosen between OD pairs
    """
    def __init__(self):
        self.id = 0  # The node's ID, starting from zero
        self.p_od_node = []  # List of OD pair starting and ending points [O, D]
        self.od_demand = 0.0  # OD demand
        self.m_n_od_path = 0  # Number of paths between OD pairs
        self.p_od_path = []  # Set of paths between OD pairs
        self.choice_prob = []  # Probability of all paths being chosen between OD pairs


class PyPath:
    """
    Path

    Attributes:
        - id: The path's ID, starting from zero
        - link_in_path: Set of segments in the path
        - path_flow: Flow of the path
        - cost_of_path: Cost of the path
        - od_pair_id: ID of the associated OD pair
    """
    def __init__(self):
        self.id = 0  # The path's ID, starting from zero
        self.link_in_path = []  # Set of segments in the path
        self.path_flow = 0.0  # Flow of the path
        self.cost_of_path = 0.0  # Cost of the path
        self.od_pair_id = -1  # ID of the associated OD pair


class PyNetwork:
    """
    Main network of the algorithm

    Attributes:
        - theta: Theta
        - ita: Ita
        - gama: Gama
        - link_flow: Segment flow
        - descent_direction: Descent direction
        - max_ue_gap: Maximum UE error
        - ue_gap: UE error
        - cpu_time: CPU Time
        - shortest_path_cost: Shortest distance
        - shortest_path_parent: Predecessor segment of the shortest path
        - output_path: Output path

        - m_node: Set of network nodes
        - node_distance_matrix: Distance matrix of network nodes

        - m_link: Set of network segments
        - m_path: Set of network paths
        - m_od_pairs: Set of OD pairs in the network
        - m_n_node: Number of nodes
        - m_n_link: Number of segments
        - m_n_od_pairs: Number of origins
        - m_n_path: Number of paths

        - links_flow: Flow of each segment
        - title: Network title
        - desc: Network description

        - avg_flow: Average segment flow
        - avg_speed: Average speed (travel_time/free_flow_travel_time)
        - alg_cnt: Number of algorithm runs
        - cost_sum: Cost to meet all demands
        
        - build_link_len: Number of new roads needed
        - close_link_len: Number of roads to be closed
        - tunnel_num: Number of tunnels

    Defines some important variables in the solving algorithm:
        Such as model parameters, segment flow, descent direction, UE error, and statistical variables related to the basic structure of the network.

    Additionally, the class constructs functions to implement the algorithm, which are the main components of the algorithm.
    """

    def __init__(self):
        # Algorithm parameter settings
        # self.theta = 1.0 # Theta
        self.theta = 0.3
        self.ita = 1.5  # Ita
        self.gama = 0.01  # Gama
        self.link_flow = []  # Segment flow
        self.descent_direction = []  # Descent direction
        self.max_ue_gap = 1.0e-10  # Maximum UE error
        self.ue_gap = 0.0  # UE error
        self.cpu_time = 0.0  # CPU Time
        self.shortest_path_cost = []  # Shortest distance
        self.shortest_path_parent = []  # Predecessor segment of the shortest path
        self.output_path = "./output.txt"  # Output path

        # Related to the four classes
        self.m_node = []  # Set of network nodes
        # Distance matrix of network nodes
        self.node_distance_matrix = np.array([])

        self.m_link = []  # Set of network segments
        self.m_path = []  # Set of network paths
        self.m_od_pairs = []  # Set of OD pairs in the network
        self.m_n_node = 0  # Number of nodes
        self.m_n_link = 0  # Number of segments
        self.m_n_od_pairs = 0  # Number of origins
        self.m_n_path = 0  # Number of paths

        self.links_flow = []  # Flow of each segment
        self.title = "Network"  # Title
        self.desc = "Network Description"  # Description

        self.avg_flow = 0
        self.avg_speed = 0
        self.alg_cnt = 0
        self.cost_sum = 0

        self.build_link_len = 0
        self.close_link_len = 0
        self.tunnel_num = 0


    def read_node(self, DataPath):
        """
        Read node file
            - DataPath: Location of the node file

        File format: Node ID X coordinate Y coordinate
        """
        # Check if the path exists
        if not os.path.exists(DataPath):
            print(f"Node Read Error: {DataPath} does not exist!")
            return

        # Start reading the file
        self.m_node = []
        self.m_n_node = 0
        with open(DataPath, 'r') as f1:
            for row in f1:
                if row == "":
                    continue
                Data = row.split('\t')
                pNode = PyNode()
                pNode.id = self.m_n_node
                pNode.position_x = float(Data[1])
                pNode.position_y = float(Data[2])
                pNode.lat = float(Data[3])
                pNode.lon = float(Data[4])
                self.m_n_node += 1
                self.m_node.append(pNode)

            # Initialize the node distance matrix
            self.node_distance_matrix = np.full(
                (self.m_n_node, self.m_n_node), float('inf'))
            np.fill_diagonal(self.node_distance_matrix, 0)

    def get_network_center(self):
        """
        Obtain the latitude and longitude of the network center point.
        """
        lat_sum = 0
        lon_sum = 0
        nodes_num = len(self.m_node)
        for now_node in self.m_node:
            lat_sum += now_node.lat
            lon_sum += now_node.lon

        if nodes_num != 0:
            lat_sum /= nodes_num
            lon_sum /= nodes_num

        return lat_sum, lon_sum

    def read_link(self, DataPath):
        """
        Read link file
            - DataPath: Location of the link file
        
        Link file format: Incoming node of the segment, outgoing node of the segment, free flow travel time, capacity of the segment
        """
        # Check if the path exists
        if not os.path.exists(DataPath):
            print(f"{DataPath} does not exist!")
            return
        self.m_link = []
        self.m_n_link = 0
        with open(DataPath, 'r') as f2:
            # Read the file content line by line
            for row in f2:
                if row == "":
                    continue
                Data = row.split('\t')
                p_link = PyLink()
                p_link.id = self.m_n_link
                p_link.p_in_node = self.m_node[int(Data[0]) - 1]
                p_link.p_out_node = self.m_node[int(Data[1]) - 1]
                p_link.free_flow_travel_time = float(Data[2])
                p_link.capacity = float(Data[3])
                p_link.p_in_node.outgoing_link.append(p_link.id)
                p_link.p_out_node.incoming_link.append(p_link.id)
                self.m_n_link += 1
                self.m_link.append(p_link)

    def read_od_pairs(self, DataPath):
        """
        Read OD pairs file
            - DataPath: Path to the OD pairs file

        OD pairs file format: Origin point, Destination point, OD demand
        """
        if not os.path.exists(DataPath):
            print(f"{DataPath} does not exist!")
            return
        self.m_od_pairs = []
        self.m_n_od_pairs = 0
        with open(DataPath, 'r') as f3:
            for row in f3:
                if row == "":
                    continue
                Data = row.split('\t')
                pOrigin = PyODPairs()
                pOrigin.id = self.m_n_od_pairs
                ONode = int(Data[0]) - 1
                pOrigin.p_od_node.append(ONode)
                DNode = int(Data[1]) - 1
                pOrigin.p_od_node.append(DNode)
                pOrigin.od_demand = float(Data[2])
                self.m_n_od_pairs += 1
                self.m_od_pairs.append(pOrigin)

                # Mark nodes as part of an OD pair
                self.m_node[ONode].is_od = True
                self.m_node[DNode].is_od = True

    def check_nodes_access(self):
        """
        Get the points reachable from each point
        """
        for node_id in range(self.m_n_node):
            out_links = self.m_node[node_id].outgoing_link
            in_links = self.m_node[node_id].incoming_link
            neighbor_in_nodes = [
                self.m_link[link_id].p_in_node.id for link_id in in_links]
            neighbor_out_nodes = [
                self.m_link[link_id].p_out_node.id for link_id in out_links]
            
            union_nodes_set = set(neighbor_in_nodes).union(neighbor_out_nodes)
            if len(union_nodes_set) <= 2:
                self.m_node[node_id].binary_ways = True
            else:
                self.m_node[node_id].binary_ways = False

        tmp = [node.binary_ways for node in self.m_node]
        print(tmp)

    def _bfs(self, start, end):
        """
        Calculate the segments between any two points using BFS

            - start: Node ID of the starting node
            - end: Node ID of the ending node
        """
        end_paths_idx = []
        former_nodes_tree = [start]
        from_links_tree = [-1]
        from_idxs_in_tree = [-1]
        visited_nodes = [[start]]
        paths_len = [0]
        now_pos = 0
        min_path_len = float('inf')

        max_path = 20
        while now_pos < len(former_nodes_tree):
            # If the current node is the endpoint
            now_node_id = former_nodes_tree[now_pos]
            if now_node_id == end:
                # print("end")
                end_paths_idx.append(now_pos)
                if paths_len[now_pos] < min_path_len:
                    min_path_len = paths_len[now_pos]

                if len(end_paths_idx) > max_path:
                    break
            elif len(end_paths_idx) > 0 and paths_len[now_pos] > 2*min_path_len:
                now_pos += 1
                continue
            else:
                # Traverse all outgoing nodes
                # now_node = self.m_node[now_node_id]
                for out_link_id in self.m_node[now_node_id].outgoing_link:
                    neighbor = self.m_link[out_link_id].p_out_node.id
                    # Avoid visiting nodes that are already in the path to prevent forming cycle
                    if neighbor not in visited_nodes[now_pos]:
                        # Update the recorded array
                        former_nodes_tree.append(neighbor)
                        from_links_tree.append(out_link_id)
                        from_idxs_in_tree.append(now_pos)
                        visited_nodes.append(visited_nodes[now_pos] + [neighbor])
                        paths_len.append(
                            paths_len[now_pos] + self.m_link[out_link_id].free_flow_travel_time)

            now_pos += 1

        return former_nodes_tree, from_links_tree, from_idxs_in_tree, end_paths_idx, paths_len

    def compute_path_bfs(self):
        """
        Calculate path information using OD pairs and segment information
        """
        self.m_path = []
        self.m_n_path = 0
        num_in_b = 0

        for od_pair in tqdm.tqdm(self.m_od_pairs, desc="compute path"):
            start_node_id = od_pair.p_od_node[0]
            end_node_id = od_pair.p_od_node[1]
            former_nodes_tree, from_links_tree, from_idxs_in_tree, end_paths_idx, paths_len =\
                self._bfs(start_node_id, end_node_id)
            # Sort all paths
            paths_len_info = [{"l": paths_len[end_pos], "p": end_pos} for end_pos in end_paths_idx]
            sorted_paths = sorted(paths_len_info, key=lambda x: x["l"])

            # Modify information in OD pairs
            # Initialize information
            min_path_len = sorted_paths[0]['l']
            od_pair.p_od_path = []
            od_pair.m_n_od_path = 0

            num_in_b += len(end_paths_idx)
            if len(end_paths_idx) == 0:
                print(f"[Error] No way from node \"{start_node_id}\" to node \"{end_node_id}\"!")
            
            # Traverse to create paths
            # print(sorted_paths[0]['l'], end=' ')
            for path_len_info_idx in range(len(sorted_paths)):
                path_len_info = sorted_paths[path_len_info_idx]

                if path_len_info['l'] > sorted_paths[path_len_info_idx-1]['l']:
                    if od_pair.m_n_od_path > 8:
                        break
                    elif od_pair.m_n_od_path >= 5 and path_len_info['l'] > 2*min_path_len:
                        break

                # Calculate links in the path
                links_path = []
                now_pos = path_len_info['p']
                while from_links_tree[now_pos] != -1:
                    links_path.append(from_links_tree[now_pos])
                    now_pos = from_idxs_in_tree[now_pos]

                # Create path information
                p_path = PyPath()
                p_path.id = self.m_n_path
                p_path.link_in_path = links_path

                # Record path information in the OD pairs
                od_pair.p_od_path.append(p_path.id)
                p_path.od_pair_id = od_pair.id

                self.m_path.append(p_path)
                self.m_n_path += 1
                od_pair.m_n_od_path += 1

        print(f"path_num: {self.m_n_path}, num_in_b: {num_in_b}")

    def read_path(self, DataPath):
        """
        Read path collection
            - DataPath: Path to the path file

        """
        # Check if the path exists
        if not os.path.exists(DataPath):
            print(f"{DataPath} does not exist!")
            return

        # Set of network paths
        self.m_path = []
        # Number of paths
        self.m_n_path = 0
        
        with open(DataPath, 'r') as f4:
            p_od_pairs = PyODPairs()
            num_of_row = 1
            num_of_path = 0
            num = 0
            for row in f4:
                if row == "":
                    continue
                Data = row.split('\t')

                # Header Data: OD Pair ID, O Point, D Point, Number of Paths Between OD.
                if num_of_row == 1:
                    od_pairsID = int(Data[0]) - 1
                    num_of_path = int(Data[3])
                    p_od_pairs = self.m_od_pairs[od_pairsID]
                    p_od_pairs.m_n_od_path = num_of_path
                    num_of_row += 1

                    # print(f"{row}", end='')
                    continue

                # Each path in the OD pair
                if num < num_of_path:
                    num += 1
                    p_path = PyPath()
                    p_path.id = self.m_n_path
                    p_od_pairs.p_od_path.append(p_path.id)
                    
                    # id of the associated OD pair
                    p_path.od_pair_id = od_pairsID
                    link_in_n = int(Data[0]) - 1
                    for node in range(1, len(Data)):
                        link_out_n = int(Data[node]) - 1
                        for link in range(self.m_n_link):
                            p_link = self.m_link[link]
                            if (link_in_n == p_link.p_in_node.id) and (link_out_n == p_link.p_out_node.id):
                                p_path.link_in_path.append(link)
                                break
                        link_in_n = link_out_n
                    self.m_path.append(p_path)
                    self.m_n_path += 1
                    continue
                else:
                    # All paths for the OD pair have been read; now reading the header information for the next OD pair
                    num = 0
                    od_pairsID = int(Data[0]) - 1
                    num_of_path = int(Data[3])
                    p_od_pairs = self.m_od_pairs[od_pairsID]
                    p_od_pairs.m_n_od_path = num_of_path
                    
                    # print(f"{row}", end='')

    def route_choice_prob(self, od_pairs):
        """
        Calculate path selection probability
        """
        p_od_pairs = self.m_od_pairs[od_pairs]
        choice_prob = []
        Sum = 0
        for path in p_od_pairs.p_od_path:
            p_path = self.m_path[path]
            LogitPara = math.exp(-self.theta * p_path.cost_of_path)
            Sum += LogitPara
            choice_prob.append(LogitPara)
            # if LogitPara == 0:
            #     print("0 nb!")

        for index in range(len(choice_prob)):
            choice_prob[index] /= Sum
        return choice_prob


    def get_ue_gap(self, link_flow):
        """
        Gap function to obtain UE error

        Parameters:
            - link_flow: Initial segment flow link_flow (index corresponds to ID in CLink)

        Return:
            - Value of the gap function
        """
        num1 = 0
        # Calculate the denominator of the subtracted term + update segment travel time (travel cost: TravelTime)
        for link in range(self.m_n_link):
            p_link = self.m_link[link]

            # Update travel_time
            p_link.travel_time = self.BPR(
                p_link.free_flow_travel_time, link_flow[link], p_link.capacity)

            # Calculate single summation term
            num1 += (p_link.travel_time * link_flow[link])

        num2 = 0
        self.floyd_algorithm()
        # Calculate the numerator of the subtracted term
        for od_pairs in range(self.m_n_od_pairs):
            # Loop through OD pairs
            p_od_pairs = self.m_od_pairs[od_pairs]
            OriginNode = p_od_pairs.p_od_node[0]
            DestinationNode = p_od_pairs.p_od_node[1]
            Demand = p_od_pairs.od_demand
            # ODCost = self.get_shortest_cost(OriginNode, DestinationNode)

            # Use Floyd's algorithm to calculate the shortest path
            ODCost = self.node_distance_matrix[OriginNode, DestinationNode]
            num2 += (Demand * ODCost)

        # Calculate the gap function value
        UEGap = 1 - num2 / num1

        return UEGap


    def BPR(self, FreeFlowTravelTime, Flow, Capacity):
        """
        Solve the BPR function

        Parameters:
            - FreeFlowTravelTime: The free flow travel cost of the segment
            - Flow: The flow of the segment
            - Capacity: The capacity of the segment
        """
        if Capacity != 0:
            BPRValue = FreeFlowTravelTime * (1 + 0.15 * (Flow / Capacity) ** 4)
        else:
            BPRValue = float('inf')
        return BPRValue

    def get_vector_norm(self, Vector):
        """
        Calculate the magnitude of the vector

        Parameters:
            - Vector: List of the vector
        """
        Sum = 0
        for value in Vector:
            Sum += value ** 2
        return math.sqrt(Sum)


    def get_shortest_cost(self, Start, End):
        """
        Calculate the shortest path distance

        Parameters:
            - Start: Node ID of the starting point
            - End: Node ID of the endpoint

        Return:
            - Shortest distance on the shortest path
        """
        startposition = 0
        endposition = 1

        # Current shortest path
        ShortestPathCost = [float('inf')] * self.m_n_node
        ShortestPathParent = [-1] * self.m_n_node  # Predecessor nodes
        checkList = [0] * self.m_n_node  # Queue for traversal
        binCheckList = [False] * self.m_n_node  # Whether in the queue
        bscanStatus = [False] * self.m_n_node

        ShortestPathCost[Start] = 0
        checkList[0] = Start

        while startposition != endposition:
            if startposition >= self.m_n_node:
                startposition = 0
            i = checkList[startposition]
            startposition += 1
            pNode = self.m_node[i]

            # Traverse each segment leaving node i
            for index in range(len(pNode.outgoing_link)):

                p_link = self.m_link[pNode.outgoing_link[index]]
                j = p_link.p_out_node.id  # Endpoint of the departing segment
                value = p_link.travel_time  # Time required to leave

                if ShortestPathCost[j] > ShortestPathCost[i] + value:
                    ShortestPathCost[j] = ShortestPathCost[i] + value
                    ShortestPathParent[j] = i
                    if endposition >= self.m_n_node:
                        endposition = 0
                    checkList[endposition] = j
                    endposition += 1
                    bscanStatus[j] = True
        return ShortestPathCost[End]


    def floyd_algorithm(self):
        """
        Floyd's algorithm to compute the global optimal paths
        """
        d = np.copy(self.node_distance_matrix)

       # Iterative calculation
        for k in range(self.m_n_node):
            d = np.minimum(d, np.add.outer(d[:, k], d[k, :]))

        self.node_distance_matrix = d

    def LogitSUE(self):
        """
        Use the adaptive average method to solve the SUE traffic assignment problem
        """

        # init
        K = 1 # iteration timer
        Beta = 1
        begtime = time.time()

        # init od_demand_satisfied for each link
        for link in self.m_link:
            link.od_demand_satisfied = [[0,0] for _ in self.m_node]

        # Update path travel costs based on free flow travel time
        for path in self.m_path:
            path.cost_of_path = 0
            for link in path.link_in_path:
                if link >= self.m_n_link:
                    print(f"error: {link}, {self.m_n_link}")
                p_link = self.m_link[link]
                path.cost_of_path += p_link.free_flow_travel_time

        # Calculate path selection probability
        for od_pairs in range(self.m_n_od_pairs):
            p_od_pairs = self.m_od_pairs[od_pairs]
            p_od_pairs.choice_prob = self.route_choice_prob(od_pairs)

        # Calculate path flow
        for od_pairs in range(self.m_n_od_pairs):
            p_od_pairs = self.m_od_pairs[od_pairs]
            Demand = p_od_pairs.od_demand
            for path in range(p_od_pairs.m_n_od_path):
                p_path = self.m_path[p_od_pairs.p_od_path[path]]
                Prob = p_od_pairs.choice_prob[path]
                p_path.path_flow = Demand * Prob

        # Calculate initial segment flow
        link_flow = [0] * self.m_n_link
        for path in range(self.m_n_path):
            p_path = self.m_path[path]
            for link in p_path.link_in_path:
                link_flow[link] += p_path.path_flow

        # Initialize the descent direction DescentDirection
        DescentDirection = link_flow[:]

        NormD = self.get_vector_norm(DescentDirection)

        nowtime = time.time()
        start_time = nowtime
        CPUTime = start_time - begtime

        with open(self.output_path, 'w') as tw:
            iter_num = 0
            while NormD > self.max_ue_gap:
                # print(f"iter{iter_num}: {NormD}")
                iter_num += 1

                last_now_time = nowtime
                nowtime = time.time()
                # Update path impedance based on segment flow
                for link in range(self.m_n_link):
                    p_link = self.m_link[link]
                    p_link.travel_time = self.BPR(p_link.free_flow_travel_time, link_flow[link], p_link.capacity)

                    in_node_id = p_link.p_in_node.id
                    out_node_id = p_link.p_out_node.id

                    # init distance matrix
                    if p_link.travel_time < self.node_distance_matrix[in_node_id, out_node_id]:
                        self.node_distance_matrix[in_node_id, out_node_id] = p_link.travel_time

                for path in range(self.m_n_path):
                    p_path = self.m_path[path]
                    p_path.cost_of_path = 0
                    for link in p_path.link_in_path:
                        p_link = self.m_link[link]
                        p_path.cost_of_path += p_link.travel_time

                # Calculate path selection probability
                for od_pairs in range(self.m_n_od_pairs):
                    p_od_pairs = self.m_od_pairs[od_pairs]
                    p_od_pairs.choice_prob = self.route_choice_prob(od_pairs)

                # calculate flow for paths
                for od_pairs in range(self.m_n_od_pairs):
                    p_od_pairs = self.m_od_pairs[od_pairs]
                    Demand = p_od_pairs.od_demand
                    for path in range(p_od_pairs.m_n_od_path):
                        p_path = self.m_path[p_od_pairs.p_od_path[path]]
                        Prob = p_od_pairs.choice_prob[path]
                        p_path.path_flow = Demand * Prob

                # Calculate feasible descent direction using the formula
                new_link_flow = [0] * self.m_n_link

                for path in self.m_path:
                    for link in path.link_in_path:
                        new_link_flow[link] += path.path_flow

                DescentDirection = [link_flow[i] - new_link_flow[i] for i in range(self.m_n_link)]
                NewNormD = self.get_vector_norm(DescentDirection)

                if NewNormD >= NormD:
                    Beta += self.ita
                else:
                    Beta += self.gama

                last_NormD = NormD
                NormD = NewNormD
                Lamuda = 1 / Beta # update step

                # Update segment flow
                for link in range(self.m_n_link):
                    link_flow[link] -= Lamuda * DescentDirection[link]

                K += 1

                # if K%100 == 0:
                #     print(f"K: {K:05d}, NormD: {NormD}, max_ue_gap: {self.max_ue_gap}")
                # print()

                self.ue_gap = self.get_ue_gap(link_flow)
                
                if (last_NormD == NormD): break
                nowtime = time.time()
                CPUTime = nowtime - begtime
                tw.write(f"{K},{NormD},{CPUTime}\n")

        Z = 0
        # compute od_demand_satisfied for each link
        for path in self.m_path:
            p_od_pairs = self.m_od_pairs[path.od_pair_id]
            for link in path.link_in_path:
                p_link = self.m_link[link]
                p_link.od_demand_satisfied[p_od_pairs.p_od_node[0]
                                         ][0] += int(path.path_flow)
                p_link.od_demand_satisfied[p_od_pairs.p_od_node[1]
                                         ][1] += int(path.path_flow)

        # results
        # print("Algorithm Result")
        # print("Link:", self.m_n_link)
        # print("ID\t\tFlow\t\tCost")
        self.links_flow = link_flow  # Flow of each segment
        for link in range(self.m_n_link):
            p_link = self.m_link[link]
            flow = round(link_flow[link], 0)
            cost = round(p_link.travel_time, 2)
            # print(f"{link}\t\t{flow}\t\t{cost}")
            if p_link.capacity != 0:
                Z += p_link.free_flow_travel_time * (link_flow[link] + 0.03 * (link_flow[link] ** 5) / (p_link.capacity ** 4))

        print()
        SumCost = 0
        for path in self.m_path:
            flow = round(path.path_flow, 0)
            cost = round(path.cost_of_path, 2)
            O = self.m_link[path.link_in_path[0]].p_in_node.id + 1
            D = self.m_link[path.link_in_path[-1]].p_out_node.id + 1
            SumCost += path.path_flow * path.cost_of_path
        self.cost_sum = SumCost

        for link_idx in range(self.m_n_link):
            self.avg_flow += self.links_flow[link_idx]
            self.avg_speed += self.m_link[link_idx].free_flow_travel_time/self.m_link[link_idx].travel_time
        self.avg_flow /= self.m_n_link
        self.avg_speed /= self.m_n_link

        endtime = time.time()
        CPUTime = endtime - begtime
        # print()
        # print("Number of Iterations:", K)
        print("Objective Function:", Z)
        print("Total Impedance:", SumCost)
        print(f"LogitSUE End, CPUTime: {CPUTime} seconds")

    def change_link_capcity(self, link_idx: int, new_capacity: float):
        """
        Modify the capacity of the segment

        Parameters:
            - link_idx: Segment index
            - new_capacity: Target value to modify
        """
        res = self.m_link[link_idx].capacity - new_capacity
        if res == 0:
            return -1
        elif res > 0:
            res = 2
        else: res = 1

        self.m_link[link_idx].capacity = new_capacity
        return res

    def change_link_free_travel_time(self, link_idx: int, free_flow_travel_time: float):
        """
        Modify the free flow travel time of the segment

        Parameters:
            - link_idx: Segment index
            - free_flow_travel_time: Target value to modify
        """
        res = self.m_link[link_idx].free_flow_travel_time - free_flow_travel_time
        self.m_link[link_idx].free_flow_travel_time = free_flow_travel_time
        if res == 0:
            return -1
        elif res > 0:
            return 7
        else: return 8
        
    def change_algorithm_parameter(self, theta: float, ita: float, gama: float, max_ue_gap: float):
        """
        Modify the algorithm's hyperparameters

        Parameters:
            - theta: Theta
            - ita: Ita
            - gama: Gama
            - max_ue_gap: Maximum UE error
        """
        self.theta = theta
        self.ita = ita
        self.gama = gama
        self.max_ue_gap = max_ue_gap

    def add_link(self, start_pt_id: int, end_pt_id: int, capacity:float, free_flow_travel_time: float, recompute_paths=True):
        """
        new a link
        """
        # Determine whether this segment already exists
        for now_link in self.m_link:
            if now_link.p_in_node.id == start_pt_id and now_link.p_out_node.id == end_pt_id:
                new_edits = []
                if capacity > now_link.capacity:
                    now_link.capacity = capacity
                    new_edits.append(1)
                if now_link.free_flow_travel_time < free_flow_travel_time:
                    now_link.free_flow_travel_time = free_flow_travel_time
                    new_edits.append(7)
                return now_link.id, new_edits

        p_link = PyLink()
        p_link.id = self.m_n_link
        p_link.p_in_node = self.m_node[start_pt_id]
        p_link.p_out_node = self.m_node[end_pt_id]
        p_link.free_flow_travel_time = free_flow_travel_time
        p_link.capacity = capacity
        p_link.p_in_node.outgoing_link.append(p_link.id)
        p_link.p_out_node.incoming_link.append(p_link.id)
        self.m_n_link += 1
        self.m_link.append(p_link)

        # update paths
        if recompute_paths:
            self.compute_path_bfs()
        # self.add_path_from_link(p_link.id)
        return p_link.id, [5]

    def del_link(self, links_to_del: list, recompute_paths=True):
        """
        Delete existing nodes
            - links_to_del: List of IDs of segments to be deleted
        """
        links_to_del.sort(reverse=True)
        for link_id_to_del in links_to_del:
            if link_id_to_del >= self.m_n_link:
                continue

            link_to_del = self.m_link[link_id_to_del]
            node_a = link_to_del.p_in_node
            node_b = link_to_del.p_out_node

            # Delete the stored information of the node
            node_a.outgoing_link.remove(link_id_to_del)
            node_b.incoming_link.remove(link_id_to_del)

            # Modify ID information
            for node in self.m_node:
                for i in range(len(node.outgoing_link)):
                    if node.outgoing_link[i] > link_id_to_del:
                        node.outgoing_link[i] -= 1
                for i in range(len(node.incoming_link)):
                    if node.incoming_link[i] > link_id_to_del:
                        node.incoming_link[i] -= 1
            self.m_link.remove(self.m_link[link_id_to_del])
            for link in self.m_link:
                if link.id > link_id_to_del:
                    link.id -= 1
            self.m_n_link -= 1

        # print(self.m_n_link)
        # print(len(self.m_link))
        if recompute_paths:
            self.compute_path_bfs()

    def add_node(self, node_lat, node_lng, former_link_a_id, linka_fftt, former_link_b_id=-1, linkb_fftt=[-1,-1]):
        """
        Add new nodes to the original road
        """
        # Add the node to the network
        pNode = PyNode()
        pNode.id = self.m_n_node
        pNode.lat = float(node_lat)
        pNode.lon = float(node_lng)
        self.m_n_node += 1
        self.m_node.append(pNode)

        # Initialize the node distance matrix
        self.node_distance_matrix = np.full((self.m_n_node, self.m_n_node), float('inf'))
        np.fill_diagonal(self.node_distance_matrix, 0)

        # Save the information of the old road segments
        link_a = self.m_link[former_link_a_id]
        a_dir_capacity = link_a.capacity
        link_b = link_a
        b_dir_capacity = a_dir_capacity
        if former_link_b_id != -1:
            link_b = self.m_link[former_link_b_id]
            b_dir_capacity = link_b.capacity
        former_a_fftt = link_a.free_flow_travel_time
        former_b_fftt = link_b.free_flow_travel_time
        node_a_id = link_a.p_in_node.id
        node_b_id = link_a.p_out_node.id

        # delete old road info
        links_to_del = []
        if former_link_b_id != -1 and former_link_a_id != former_link_b_id:
            self.del_link([former_link_a_id, former_link_b_id], False)
            links_to_del = [former_link_a_id, former_link_b_id]
        else:
            self.del_link([former_link_a_id], False)
            links_to_del = [former_link_a_id]
            
        # new links
        self.add_link(node_a_id, pNode.id,
                      a_dir_capacity, linka_fftt[0], False)
        self.add_link(pNode.id, node_b_id,
                      a_dir_capacity, linka_fftt[1], False)
        if former_link_b_id != -1:
            self.add_link(node_b_id, pNode.id,
                        b_dir_capacity, linkb_fftt[0], False)
            self.add_link(pNode.id, node_a_id,
                        b_dir_capacity, linkb_fftt[1], False)
            
        # reset paths
        if former_link_a_id != former_link_b_id and former_a_fftt == linka_fftt[0]+linka_fftt[1]:
            links_new = [pNode.incoming_link, pNode.outgoing_link]
            for pPath in self.m_path:
                links_in_path = pPath.link_in_path
                for link_del_idx in range(len(links_to_del)):
                    if links_to_del[link_del_idx] in links_in_path:
                        link_idx_in_path = links_in_path.index(
                            links_to_del[link_del_idx])
                        pPath.link_in_path = links_in_path[:link_idx_in_path] + [
                            links_new[0][link_del_idx]+len(links_to_del), 
                            links_new[1][link_del_idx]+len(links_to_del)] + \
                            links_in_path[link_idx_in_path+1:]
                        
                # Update the IDs of the original links in the path
                links_in_path = pPath.link_in_path
                for link_idx_in_path in range(len(links_in_path)):
                    for link_del_idx in range(len(links_to_del)):
                        if links_in_path[link_idx_in_path] > links_to_del[link_del_idx]:
                            pPath.link_in_path[link_idx_in_path] -= 1
            return False
        else:
            # Recompute the path through calculations
            self.compute_path_bfs()
        return True

    def del_node(self, node_id):
        """
        Delete node
            - node_id: ID of the node to be deleted
        """
        # 获取该点可达的点
        out_links = self.m_node[node_id].outgoing_link
        in_links = self.m_node[node_id].incoming_link
        neighbor_in_nodes = [
            self.m_link[link_id].p_in_node.id for link_id in in_links]
        neighbor_out_nodes = [
            self.m_link[link_id].p_out_node.id for link_id in out_links]
        
        # Obtain the OD pairs for the origin and destination
        start_od_pairs = []
        end_od_pairs = []
        for od_pair in self.m_od_pairs:
            if od_pair.p_od_node[0] == node_id:
                start_od_pairs.append(od_pair.id)
            elif od_pair.p_od_node[1] == node_id:
                end_od_pairs.append(od_pair.id)

        # This point has demand and cannot be easily deleted
        if len(start_od_pairs)>0 and len(end_od_pairs)>0:
            return False

        # roads connected to this node
        self.del_link(out_links+in_links, False)
        # self.del_link(in_links, False)
        print(f"links del: {len(out_links)}, {len(in_links)}, links last: {self.m_n_link}")

        # delete thaht node
        self.m_node.pop(node_id)

        # Recalculate the paths between OD pairs
        self.compute_path_bfs()

        return True

    def add_path_from_link(self, from_link_id):
        """
        Add paths associated with the link
        """
        # Obtain the link and its starting and ending points
        from_p_link = self.m_link[from_link_id]
        start_node_id = from_p_link.p_in_node
        end_node_id = from_p_link.p_out_node

        paths_to_add = []
        for origin_path in self.m_path:
            node_start_on = False
            node_end_on = False

            path_to_push = PyPath()
            path_to_push.od_pair_id = origin_path.od_pair_id
            # Search for the presence of the starting and ending segments
            for alink_in_path_idx in origin_path.link_in_path:
                alink_in_path = self.m_link[alink_in_path_idx]
                # Determine whether it is possible to start connecting the incoming segment
                if not node_start_on:
                    if alink_in_path.p_in_node == from_p_link.p_in_node:
                        node_start_on = True

                # Copy the segments of the original path
                if not node_start_on or node_end_on:
                    path_to_push.link_in_path.append(alink_in_path_idx)

                # Determine whether it is possible to end the connection of the segment
                if node_start_on and not node_end_on:
                    if alink_in_path.p_out_node == from_p_link.p_out_node:
                        path_to_push.link_in_path.append(from_link_id)
                        node_end_on = True
            
            # Determine whether it is possible to insert the segment into the original path to form a new path
            if node_end_on:
                paths_to_add.append(path_to_push)
    
        # Insert the new path into the original map
        for new_path in paths_to_add:
            new_path.id = self.m_n_path
            od_pairsID = new_path.od_pair_id

            # Add to the network
            self.m_od_pairs[od_pairsID].p_od_path.append(new_path.id)
            self.m_od_pairs[od_pairsID].m_n_od_path += 1
                    # p_od_pairs = self.m_od_pairs[od_pairsID]
                    # p_od_pairs.m_n_od_path = num_of_path
            self.m_path.append(new_path)

            self.m_n_path += 1

        return

