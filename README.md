# TraSculptor
This is the code for our paper **Towards Better Decision-Making for Road Traffic Planning**

**TraSculptor** is an interactive planning decision-making system designed to enhance the modification and comparison of road networks. It addresses two main challenges:
- **Interactive Modification**: TraSculptor allows experts to easily and directly modify road networks on a map through flexible interactions.
- **Intuitive Comparison**: It features a comparison view that includes a history tree of multiple states and a road-state matrix, facilitating intuitive comparisons of different road network states.

## Installation
You need install [Node.js](http://nodejs.cn/download/) and [Python](https://www.python.org/).

### Python dependency Library
They're all in the requirement.txt.
```sh
flask==3.0.0
flask_cors==4.0.0
numpy==1.25.1
tqdm
```

### Install all dependency
```sh
pip install -r requirements.txt
```

## Data
### Source Data
```
case_study_dataset.zip
SiouxFalls_dataset.zip
EasternMassachusetts_dataset.zip
```
The files can be found in the releases of the repository. Among them, `case_study_dataset.zip` is the data used for the case study in the paper, `SiouxFalls_dataset.zip` is the data used for the user study in the paper, and `EasternMassachusetts_dataset.zip` is the data used for larger-scale network testing.

### File Path
The datasets has been included in the repository.
If you find that the dataset is missing, please download the compressed package of the dataset (`case_study_dataset.zip`, `SiouxFalls_dataset.zip` and `EasternMassachusetts_dataset.zip`) from the release, unzip them, and then move all the folders inside to `/Backend/data/`.

## How To Run this Project

### Frontend -- Vue
#### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.vscode-typescript-vue-plugin).

#### Customize configuration
See [Vite Configuration Reference](https://vitejs.dev/config/).

#### Enter the Folder
```sh
cd Frontend
```

#### Project Setup
```sh
npm install
```

#### Compile and Hot-Reload for Development
```sh
npm run dev
```

#### Compile and Minify for Production
```sh
npm run build
```


### Backend -- Flask
#### Recommended IDE Setup
[VSCode](https://code.visualstudio.com/)

#### Enter the Folder
```sh
cd Backend
```

#### Compile and Run for Development
- For the small-scale case study dataset:
```sh
python app.py --dataset mini_data
```

- For the Sioux Falls dataset used in the user study:
```sh
python app.py --dataset data
```

- For the larger-scale Eastern Massachusetts dataset:
```sh
python app.py --dataset data_EasternMassachusetts
```

## Contact
We are glad to hear from you. If you have any questions, please feel free to contact zikun.rain@gmail.com or open issues on this repository.