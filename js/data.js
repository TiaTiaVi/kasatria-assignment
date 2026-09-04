// This file provides the 200-person dataset.
// Right now it's hardcoded from your CSV so we can build and test the visualization.
// LATER: we will replace getData() with a real fetch() call to your published Google Sheet.

const PEOPLE_DATA = [
 {
  "name": "Lee Siew Suan",
  "photo": "https://static.kasatria.com/pivot-img/photo/019.jpg",
  "age": "25",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 251260.8
 },
 {
  "name": "New Yee Chian",
  "photo": "https://static.kasatria.com/pivot-img/photo/020.jpg",
  "age": "23",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 60393.6
 },
 {
  "name": "Wong Thiam Fook",
  "photo": "https://static.kasatria.com/pivot-img/photo/021.jpg",
  "age": "30",
  "country": "CN",
  "interest": "Traveling",
  "netWorth": 212140.8
 },
 {
  "name": "Norsuzilawati Mohd Noor",
  "photo": "https://static.kasatria.com/pivot-img/photo/022.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 208228.8
 },
 {
  "name": "Norzainah Omar",
  "photo": "https://static.kasatria.com/pivot-img/photo/023.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 106555.2
 },
 {
  "name": "Meghandran Nathy",
  "photo": "https://static.kasatria.com/pivot-img/photo/024.jpg",
  "age": "31",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 139080.0
 },
 {
  "name": "Joyshree Goswami",
  "photo": "https://static.kasatria.com/pivot-img/photo/025.jpg",
  "age": "35",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 192278.4
 },
 {
  "name": "Geetha Maniam",
  "photo": "https://static.kasatria.com/pivot-img/photo/026.jpg",
  "age": "27",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 90864.0
 },
 {
  "name": "Abdul Rahim Osman",
  "photo": "https://static.kasatria.com/pivot-img/photo/027.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 141859.2
 },
 {
  "name": "Prem Anand Raj",
  "photo": "https://static.kasatria.com/pivot-img/photo/028.jpg",
  "age": "44",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 196113.6
 },
 {
  "name": "Piara Singh Sarwan Singh",
  "photo": "https://static.kasatria.com/pivot-img/photo/029.jpg",
  "age": "34",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 207960.0
 },
 {
  "name": "Othman b Abdul Rahman",
  "photo": "https://static.kasatria.com/pivot-img/photo/030.jpg",
  "age": "53",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 193200.0
 },
 {
  "name": "Sathiaseelan Paul Thurai",
  "photo": "https://static.kasatria.com/pivot-img/photo/031.jpg",
  "age": "59",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 264456.0
 },
 {
  "name": "Abdul Farid Alias",
  "photo": "https://static.kasatria.com/pivot-img/photo/MY0014.jpg",
  "age": "36",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 146592.0
 },
 {
  "name": "Abu Hassan Assari Ibrahim",
  "photo": "https://static.kasatria.com/pivot-img/photo/MY0010.jpg",
  "age": "43",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 213657.6
 },
 {
  "name": "Faridah Ahmad Iskandar",
  "photo": "https://static.kasatria.com/pivot-img/photo/MY_003.jpg",
  "age": "31",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 271516.8
 },
 {
  "name": "Muzaffar Hisham",
  "photo": "https://static.kasatria.com/pivot-img/photo/MY0009.jpg",
  "age": "35",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 230980.8
 },
 {
  "name": "Isaac Cardinal",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0088.jpg",
  "age": "49",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 259252.8
 },
 {
  "name": "Prabunathan A/L Gopal",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_021.jpg",
  "age": "29",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 271670.4
 },
 {
  "name": "Taswin Zakaria",
  "photo": "https://static.kasatria.com/pivot-img/photo/MY0012.jpg",
  "age": "41",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 243840.0
 },
 {
  "name": "Crystal Carter",
  "photo": "https://static.kasatria.com/pivot-img/photo/039.jpg",
  "age": "35",
  "country": "US",
  "interest": "Cooking",
  "netWorth": 211550.4
 },
 {
  "name": "Vivian Grapentine",
  "photo": "https://static.kasatria.com/pivot-img/photo/040.jpg",
  "age": "36",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 149361.6
 },
 {
  "name": "Joey De Leion",
  "photo": "https://static.kasatria.com/pivot-img/photo/041.jpg",
  "age": "35",
  "country": "US",
  "interest": "Hiking",
  "netWorth": 60974.4
 },
 {
  "name": "Mark Feehily",
  "photo": "https://static.kasatria.com/pivot-img/photo/042.jpg",
  "age": "30",
  "country": "US",
  "interest": "Cooking",
  "netWorth": 125496.0
 },
 {
  "name": "Cheong Choong Kong",
  "photo": "https://static.kasatria.com/pivot-img/photo/114.jpg",
  "age": "25",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 111412.8
 },
 {
  "name": "George Lee Lap Wah",
  "photo": "https://static.kasatria.com/pivot-img/photo/115.jpg",
  "age": "31",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 146174.4
 },
 {
  "name": "Yong Mei Theng",
  "photo": "https://static.kasatria.com/pivot-img/photo/116.jpg",
  "age": "28",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 187896.0
 },
 {
  "name": "Tang Zhee Kim",
  "photo": "https://static.kasatria.com/pivot-img/photo/117.jpg",
  "age": "24",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 264355.2
 },
 {
  "name": "Tan Miaw Wei",
  "photo": "https://static.kasatria.com/pivot-img/photo/118.jpg",
  "age": "25",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 101841.6
 },
 {
  "name": "Cheng Ming Soon",
  "photo": "https://static.kasatria.com/pivot-img/photo/119.jpg",
  "age": "18",
  "country": "CN",
  "interest": "Traveling",
  "netWorth": 210835.2
 },
 {
  "name": "Lee Fong Fong",
  "photo": "https://static.kasatria.com/pivot-img/photo/120.jpg",
  "age": "25",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 193017.6
 },
 {
  "name": "Amir Amran Karim",
  "photo": "https://static.kasatria.com/pivot-img/photo/121.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 147600.0
 },
 {
  "name": "Krishnan CK Menon",
  "photo": "https://static.kasatria.com/pivot-img/photo/122.jpg",
  "age": "25",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 207355.2
 },
 {
  "name": "Aishwarya Rai",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_041.jpg",
  "age": "32",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 186398.4
 },
 {
  "name": "Simone Kumar Gopalan",
  "photo": "https://static.kasatria.com/pivot-img/photo/124.jpg",
  "age": "36",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 327057.6
 },
 {
  "name": "Maimoonah Hussain",
  "photo": "https://static.kasatria.com/pivot-img/photo/125.jpg",
  "age": "27",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 181228.8
 },
 {
  "name": "Chanda Kochar",
  "photo": "https://static.kasatria.com/pivot-img/photo/126.jpg",
  "age": "30",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 133228.8
 },
 {
  "name": "Shyamala Gopinath",
  "photo": "https://static.kasatria.com/pivot-img/photo/127.jpg",
  "age": "20",
  "country": "IN",
  "interest": "Traveling",
  "netWorth": 267230.4
 },
 {
  "name": "Suren Zedek",
  "photo": "https://static.kasatria.com/pivot-img/photo/128.jpg",
  "age": "35",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 89764.8
 },
 {
  "name": "Danial Kuilan",
  "photo": "https://static.kasatria.com/pivot-img/photo/129.jpg",
  "age": "35",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 246686.4
 },
 {
  "name": "Levi Asher Anamalai",
  "photo": "https://static.kasatria.com/pivot-img/photo/130.jpg",
  "age": "19",
  "country": "IN",
  "interest": "Traveling",
  "netWorth": 170260.8
 },
 {
  "name": "Tristan Martin",
  "photo": "https://static.kasatria.com/pivot-img/photo/131.jpg",
  "age": "52",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 181555.2
 },
 {
  "name": "David Conner",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0294.jpg",
  "age": "55",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 282019.2
 },
 {
  "name": "Kerry Jen Katona",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0285.jpg",
  "age": "43",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 250579.2
 },
 {
  "name": "Gilbert Kohnke",
  "photo": "https://static.kasatria.com/pivot-img/photo/134.jpg",
  "age": "55",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 344318.4
 },
 {
  "name": "Spencer Murray",
  "photo": "https://static.kasatria.com/pivot-img/photo/135.jpg",
  "age": "52",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 240638.4
 },
 {
  "name": "Yaacob Mohd Zain",
  "photo": "https://static.kasatria.com/pivot-img/photo/136.jpg",
  "age": "24",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 205372.8
 },
 {
  "name": "Hatini Mat Husin",
  "photo": "https://static.kasatria.com/pivot-img/photo/137.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 350774.4
 },
 {
  "name": "Ariffin Alias",
  "photo": "https://static.kasatria.com/pivot-img/photo/138.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 241670.4
 },
 {
  "name": "Abdul Malik A Rahman",
  "photo": "https://static.kasatria.com/pivot-img/photo/139.jpg",
  "age": "42",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 197779.2
 },
 {
  "name": "Samad Mahid Zain",
  "photo": "https://static.kasatria.com/pivot-img/photo/140.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 245827.2
 },
 {
  "name": "Johan Hashim",
  "photo": "https://static.kasatria.com/pivot-img/photo/141.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 184915.2
 },
 {
  "name": "Samsiah Zainal",
  "photo": "https://static.kasatria.com/pivot-img/photo/142.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 259180.8
 },
 {
  "name": "Tay Eng Yaw",
  "photo": "https://static.kasatria.com/pivot-img/photo/009.jpg",
  "age": "27",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 188457.6
 },
 {
  "name": "Cynthiea Hong Pei Min",
  "photo": "https://static.kasatria.com/pivot-img/photo/010.jpg",
  "age": "22",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 164865.6
 },
 {
  "name": "Lim Yong Siang",
  "photo": "https://static.kasatria.com/pivot-img/photo/011.jpg",
  "age": "40",
  "country": "CN",
  "interest": "Gardening",
  "netWorth": 347481.6
 },
 {
  "name": "Mohd Azam Mohd Bakar",
  "photo": "https://static.kasatria.com/pivot-img/photo/018.jpg",
  "age": "38",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 166795.2
 },
 {
  "name": "Jagathesan Shanmugam",
  "photo": "https://static.kasatria.com/pivot-img/photo/043.jpg",
  "age": "43",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 97075.2
 },
 {
  "name": "Christiana Tharsis",
  "photo": "https://static.kasatria.com/pivot-img/photo/044.jpg",
  "age": "35",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 243014.4
 },
 {
  "name": "Amutha Rakwan",
  "photo": "https://static.kasatria.com/pivot-img/photo/045.jpg",
  "age": "46",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 100396.8
 },
 {
  "name": "Wan Rosmawati Wan Ibrahim",
  "photo": "https://static.kasatria.com/pivot-img/photo/046.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 191616.0
 },
 {
  "name": "Khatimah Mahadi",
  "photo": "https://static.kasatria.com/pivot-img/photo/047.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 265171.2
 },
 {
  "name": "Nor Rozita Nordin",
  "photo": "https://static.kasatria.com/pivot-img/photo/048.jpg",
  "age": "32",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 246158.4
 },
 {
  "name": "Abdul Aziz Man",
  "photo": "https://static.kasatria.com/pivot-img/photo/049.jpg",
  "age": "32",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 312158.4
 },
 {
  "name": "Nimma Safira Khalid",
  "photo": "https://static.kasatria.com/pivot-img/photo/050.jpg",
  "age": "19",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 258384.0
 },
 {
  "name": "Lam Swee Kim",
  "photo": "https://static.kasatria.com/pivot-img/photo/012.jpg",
  "age": "23",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 148718.4
 },
 {
  "name": "Tai Yee Shian",
  "photo": "https://static.kasatria.com/pivot-img/photo/013.jpg",
  "age": "34",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 195206.4
 },
 {
  "name": "Euodia Ooi",
  "photo": "https://static.kasatria.com/pivot-img/photo/014.jpg",
  "age": "27",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 52118.4
 },
 {
  "name": "Ng Jia Nian",
  "photo": "https://static.kasatria.com/pivot-img/photo/015.jpg",
  "age": "24",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 340464.0
 },
 {
  "name": "Ong Tze Jun",
  "photo": "https://static.kasatria.com/pivot-img/photo/016.jpg",
  "age": "36",
  "country": "CN",
  "interest": "Hiking",
  "netWorth": 159739.2
 },
 {
  "name": "Brian Choong Chee Keong",
  "photo": "https://static.kasatria.com/pivot-img/photo/017.jpg",
  "age": "21",
  "country": "CN",
  "interest": "Traveling",
  "netWorth": 347659.2
 },
 {
  "name": "Shaharuddin Abg Mansor",
  "photo": "https://static.kasatria.com/pivot-img/photo/086.jpg",
  "age": "47",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 351993.6
 },
 {
  "name": "Mohd Izani Ashari",
  "photo": "https://static.kasatria.com/pivot-img/photo/087.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 230179.2
 },
 {
  "name": "Roshan Thiran",
  "photo": "https://static.kasatria.com/pivot-img/photo/088.jpg",
  "age": "26",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 369652.8
 },
 {
  "name": "Shahazwan Harris",
  "photo": "https://static.kasatria.com/pivot-img/photo/089.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 364948.8
 },
 {
  "name": "Saiful Dzulkifly",
  "photo": "https://static.kasatria.com/pivot-img/photo/090.jpg",
  "age": "36",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 360115.2
 },
 {
  "name": "Jamie Haniff Ramlee",
  "photo": "https://static.kasatria.com/pivot-img/photo/091.jpg",
  "age": "47",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 174312.0
 },
 {
  "name": "Azim Azli",
  "photo": "https://static.kasatria.com/pivot-img/photo/092.jpg",
  "age": "50",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 160252.8
 },
 {
  "name": "Zaida Khalida Shaari",
  "photo": "https://static.kasatria.com/pivot-img/photo/093.jpg",
  "age": "25",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 163104.0
 },
 {
  "name": "Nurul Nabila Huda Che Ad",
  "photo": "https://static.kasatria.com/pivot-img/photo/094.jpg",
  "age": "39",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 247579.2
 },
 {
  "name": "Sarimah Samad-Imran",
  "photo": "https://static.kasatria.com/pivot-img/photo/095.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 102580.8
 },
 {
  "name": "Wan Nur Nordiyana",
  "photo": "https://static.kasatria.com/pivot-img/photo/096.jpg",
  "age": "25",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 264705.6
 },
 {
  "name": "Fatimah Husna",
  "photo": "https://static.kasatria.com/pivot-img/photo/097.jpg",
  "age": "25",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 72710.4
 },
 {
  "name": "Nurshafiqah Saad",
  "photo": "https://static.kasatria.com/pivot-img/photo/098.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 128750.4
 },
 {
  "name": "Amerjit Singh Bhag Singh",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_005.jpg",
  "age": "31",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 205171.2
 },
 {
  "name": "Nora Abd Manaf",
  "photo": "https://static.kasatria.com/pivot-img/photo/100.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 168096.0
 },
 {
  "name": "Walter Michael Chan",
  "photo": "https://static.kasatria.com/pivot-img/photo/101.jpg",
  "age": "29",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 197083.2
 },
 {
  "name": "Teng Chean Choy",
  "photo": "https://static.kasatria.com/pivot-img/photo/102.jpg",
  "age": "32",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 145862.4
 },
 {
  "name": "Chua Bee Chin",
  "photo": "https://static.kasatria.com/pivot-img/photo/103.jpg",
  "age": "23",
  "country": "CN",
  "interest": "Painting",
  "netWorth": 159883.2
 },
 {
  "name": "Santhanamary John",
  "photo": "https://static.kasatria.com/pivot-img/photo/155.jpg",
  "age": "25",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 135878.4
 },
 {
  "name": "Nor Arzlin Redzwan",
  "photo": "https://static.kasatria.com/pivot-img/photo/156.jpg",
  "age": "42",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 66907.2
 },
 {
  "name": "Zuraidah Atan",
  "photo": "https://static.kasatria.com/pivot-img/photo/157.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 104649.6
 },
 {
  "name": "Shahrul Izzan Abdul Karim",
  "photo": "https://static.kasatria.com/pivot-img/photo/158.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 46363.2
 },
 {
  "name": "Putri Shireen Syed Othman",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_047.jpg",
  "age": "33",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 96628.8
 },
 {
  "name": "Abdul Hadzi Marzuki",
  "photo": "https://static.kasatria.com/pivot-img/photo/160.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 117273.6
 },
 {
  "name": "Yasmin Ahmad",
  "photo": "https://static.kasatria.com/pivot-img/photo/161.jpg",
  "age": "24",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 58833.6
 },
 {
  "name": "Halipah Binti Esa",
  "photo": "https://static.kasatria.com/pivot-img/photo/162.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 102676.8
 },
 {
  "name": "Habibah Abdul",
  "photo": "https://static.kasatria.com/pivot-img/photo/163.jpg",
  "age": "37",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 210993.6
 },
 {
  "name": "Zulkarnain Ahmad",
  "photo": "https://static.kasatria.com/pivot-img/photo/164.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 71361.6
 },
 {
  "name": "Fauziah Mohd Noor",
  "photo": "https://static.kasatria.com/pivot-img/photo/165.jpg",
  "age": "24",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 126532.8
 },
 {
  "name": "Mohd Yunus Idris",
  "photo": "https://static.kasatria.com/pivot-img/photo/196.jpg",
  "age": "39",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 143112.0
 },
 {
  "name": "Ahmad Jauhari Yahya",
  "photo": "https://static.kasatria.com/pivot-img/photo/197.jpg",
  "age": "21",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 159422.4
 },
 {
  "name": "Saifol Bahri Mohamad Shamlan",
  "photo": "https://static.kasatria.com/pivot-img/photo/198.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 198936.0
 },
 {
  "name": "Isham Ishak",
  "photo": "https://static.kasatria.com/pivot-img/photo/199.jpg",
  "age": "40",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 112598.4
 },
 {
  "name": "Mohd Hafizuddin Mansor",
  "photo": "https://static.kasatria.com/pivot-img/photo/200.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 99624.0
 },
 {
  "name": "Stuart Cardell",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0292.jpg",
  "age": "44",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 44140.8
 },
 {
  "name": "Abigail Wellington",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0237.jpg",
  "age": "33",
  "country": "US",
  "interest": "Painting",
  "netWorth": 126201.6
 },
 {
  "name": "Gino Chin",
  "photo": "https://static.kasatria.com/pivot-img/photo/c_035.jpg",
  "age": "33",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 178569.6
 },
 {
  "name": "Meon Khor",
  "photo": "https://static.kasatria.com/pivot-img/photo/c_016.jpg",
  "age": "37",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 132936.0
 },
 {
  "name": "Lim Joo ann",
  "photo": "https://static.kasatria.com/pivot-img/photo/c_013.jpg",
  "age": "30",
  "country": "CN",
  "interest": "Writing",
  "netWorth": 183110.4
 },
 {
  "name": "Yong Hai Wen",
  "photo": "https://static.kasatria.com/pivot-img/photo/CN_038.jpg",
  "age": "19",
  "country": "CN",
  "interest": "Traveling",
  "netWorth": 259123.2
 },
 {
  "name": "Yuki Low Mei Shan",
  "photo": "https://static.kasatria.com/pivot-img/photo/CN_024.jpg",
  "age": "28",
  "country": "CN",
  "interest": "Hiking",
  "netWorth": 191016.0
 },
 {
  "name": "Jessica Tee Yan Lai",
  "photo": "https://static.kasatria.com/pivot-img/photo/J_013.jpg",
  "age": "36",
  "country": "CN",
  "interest": "Hiking",
  "netWorth": 152433.6
 },
 {
  "name": "Sam Yam",
  "photo": "https://static.kasatria.com/pivot-img/photo/J_003.jpg",
  "age": "29",
  "country": "CN",
  "interest": "Cooking",
  "netWorth": 57499.2
 },
 {
  "name": "Shanker Jorrama",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_057.jpg",
  "age": "36",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 220142.4
 },
 {
  "name": "Vick Viknes",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_010.jpg",
  "age": "21",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 267307.2
 },
 {
  "name": "Arul Krishnan",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_035.jpg",
  "age": "35",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 69883.2
 },
 {
  "name": "Shamini Mohanan",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_014.jpg",
  "age": "28",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 363681.6
 },
 {
  "name": "Theodore Frazer",
  "photo": "https://static.kasatria.com/pivot-img/photo/o_009.jpg",
  "age": "49",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 361166.4
 },
 {
  "name": "Aju Varghese",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_028.jpg",
  "age": "43",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 324686.4
 },
 {
  "name": "Shahrukh Khan",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_032.jpg",
  "age": "40",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 287155.2
 },
 {
  "name": "Prithviraj Sukumaran",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_040.jpg",
  "age": "50",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 363739.2
 },
 {
  "name": "Sarah Miller",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0134.jpg",
  "age": "32",
  "country": "US",
  "interest": "Painting",
  "netWorth": 101832.0
 },
 {
  "name": "Monali Thakur",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_016.jpg",
  "age": "29",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 162710.4
 },
 {
  "name": "Keerubalami Ponnudi",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_044.jpg",
  "age": "36",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 177052.8
 },
 {
  "name": "Saint Sahana",
  "photo": "https://static.kasatria.com/pivot-img/photo/i_023.jpg",
  "age": "37",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 314136.0
 },
 {
  "name": "Munish Thabur",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_020.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 171758.4
 },
 {
  "name": "Yogesh Balakrishnamur",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_011.jpg",
  "age": "21",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 238915.2
 },
 {
  "name": "Sharmilla Mogan",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_049.jpg",
  "age": "19",
  "country": "IN",
  "interest": "Traveling",
  "netWorth": 173740.8
 },
 {
  "name": "Janesree Gunasegern",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_045.jpg",
  "age": "32",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 187512.0
 },
 {
  "name": "Preya Nadarasa",
  "photo": "https://static.kasatria.com/pivot-img/photo/i_018.jpg",
  "age": "26",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 247233.6
 },
 {
  "name": "Uma Shamini",
  "photo": "https://static.kasatria.com/pivot-img/photo/i_028.jpg",
  "age": "24",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 201451.2
 },
 {
  "name": "Geetha Kumar",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_053.jpg",
  "age": "18",
  "country": "IN",
  "interest": "Traveling",
  "netWorth": 164433.6
 },
 {
  "name": "Jeeva Rajadran",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_031.jpg",
  "age": "38",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 192969.6
 },
 {
  "name": "Nadaraajan Perumal",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_008.jpg",
  "age": "25",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 165604.8
 },
 {
  "name": "Shri Gobaradhan",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_039.jpg",
  "age": "39",
  "country": "IN",
  "interest": "Writing",
  "netWorth": 218740.8
 },
 {
  "name": "Satees Muniady",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_034.jpg",
  "age": "44",
  "country": "IN",
  "interest": "Gardening",
  "netWorth": 191673.6
 },
 {
  "name": "Nur Syazwani Nabilah Ibrahim",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_190.jpg",
  "age": "33",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 210110.4
 },
 {
  "name": "Geetha Davethas",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_042.jpg",
  "age": "24",
  "country": "IN",
  "interest": "Hiking",
  "netWorth": 199689.6
 },
 {
  "name": "Pricella Ance",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_027.jpg",
  "age": "34",
  "country": "US",
  "interest": "Cooking",
  "netWorth": 141801.6
 },
 {
  "name": "Kumarran Thanrayan",
  "photo": "https://static.kasatria.com/pivot-img/photo/i_013.jpg",
  "age": "28",
  "country": "IN",
  "interest": "Cooking",
  "netWorth": 128222.4
 },
 {
  "name": "Tineswary Pannaparon",
  "photo": "https://static.kasatria.com/pivot-img/photo/i_002.jpg",
  "age": "21",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 94281.6
 },
 {
  "name": "Vinothyni Anannthi",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_015.jpg",
  "age": "22",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 357902.4
 },
 {
  "name": "Pilva Bhatia",
  "photo": "https://static.kasatria.com/pivot-img/photo/IND_013.jpg",
  "age": "29",
  "country": "IN",
  "interest": "Painting",
  "netWorth": 213988.8
 },
 {
  "name": "Wan Nahijah Mohamad",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_027.jpg",
  "age": "24",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 183710.4
 },
 {
  "name": "Rahimi Muhamad",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_066.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 191452.8
 },
 {
  "name": "Shuhada Shahira",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_090.jpg",
  "age": "19",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 258057.6
 },
 {
  "name": "Yana Husin",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_202.jpg",
  "age": "49",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 129523.2
 },
 {
  "name": "Yusri Shafie",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_163.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 166843.2
 },
 {
  "name": "Nurul Shafiza Mat Isa",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_166.jpg",
  "age": "32",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 257068.8
 },
 {
  "name": "Aidan Ohara",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_194.jpg",
  "age": "27",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 260635.2
 },
 {
  "name": "Ella Berry",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0128.jpg",
  "age": "35",
  "country": "US",
  "interest": "Cooking",
  "netWorth": 131736.0
 },
 {
  "name": "Noor Atheerah Zulkipli",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_178.jpg",
  "age": "31",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 154046.4
 },
 {
  "name": "Ikmal Zakaria",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_185.jpg",
  "age": "32",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 197380.8
 },
 {
  "name": "Syed Azuwan Syed Helmi",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_047.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 163905.6
 },
 {
  "name": "Haziq Zamri",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_187.jpg",
  "age": "27",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 99048.0
 },
 {
  "name": "Nor Fazila",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_056.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 189384.0
 },
 {
  "name": "Muhd Ruzhan",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_116.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 232641.6
 },
 {
  "name": "Azhar Masli",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_154.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 212256.0
 },
 {
  "name": "Mohd Riduan Hamin",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_120.jpg",
  "age": "40",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 235483.2
 },
 {
  "name": "Freya Rogers",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0274.jpg",
  "age": "30",
  "country": "US",
  "interest": "Painting",
  "netWorth": 240427.2
 },
 {
  "name": "Harris Azman",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_181.jpg",
  "age": "38",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 232377.6
 },
 {
  "name": "Muhammad Adli Azri",
  "photo": "https://static.kasatria.com/pivot-img/photo/th_337.jpg",
  "age": "24",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 280248.0
 },
 {
  "name": "Jafri Mohd",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_177.jpg",
  "age": "29",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 314107.2
 },
 {
  "name": "Aten Zulkifly",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_019.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 237307.2
 },
 {
  "name": "Eyqa Hassan",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_045.jpg",
  "age": "25",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 112651.2
 },
 {
  "name": "Muhd Yazid",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_018.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 76492.8
 },
 {
  "name": "Muhammad Syafiq Suhaimi",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_027.jpg",
  "age": "39",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 341563.2
 },
 {
  "name": "Nashrul Amin",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_014.jpg",
  "age": "62",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 154632.0
 },
 {
  "name": "Nur Syahirah",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_064.jpg",
  "age": "21",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 148492.8
 },
 {
  "name": "Syamimy Ghani",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_114.jpg",
  "age": "20",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 200347.2
 },
 {
  "name": "Shahir Sukri",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_028.jpg",
  "age": "34",
  "country": "MY",
  "interest": "Painting",
  "netWorth": 282700.8
 },
 {
  "name": "Amierul Miyul",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_030.jpg",
  "age": "48",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 321004.8
 },
 {
  "name": "Nara Sharkirra",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_090.jpg",
  "age": "23",
  "country": "MY",
  "interest": "Writing",
  "netWorth": 338539.2
 },
 {
  "name": "Muhamad Hafiz Bob",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_022.jpg",
  "age": "59",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 240312.0
 },
 {
  "name": "Mohd Shahril",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_023.jpg",
  "age": "48",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 252984.0
 },
 {
  "name": "Eyka Abdul Ghani",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_091.jpg",
  "age": "23",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 233726.4
 },
 {
  "name": "Mohamad Khuzairy",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_167.jpg",
  "age": "33",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 118766.4
 },
 {
  "name": "Nana Hanna",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_179.jpg",
  "age": "20",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 226276.8
 },
 {
  "name": "Mohd Hanafi Azhar",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_034.jpg",
  "age": "62",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 332568.0
 },
 {
  "name": "Zenki Afra",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_045.jpg",
  "age": "60",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 168600.0
 },
 {
  "name": "Mohamad Hairie",
  "photo": "https://static.kasatria.com/pivot-img/photo/p_050.jpg",
  "age": "48",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 300566.4
 },
 {
  "name": "Mohd Syafiq",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_168.jpg",
  "age": "57",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 215164.8
 },
 {
  "name": "Muhammad Ashri",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_165.jpg",
  "age": "27",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 206568.0
 },
 {
  "name": "Yusni Asnida",
  "photo": "https://static.kasatria.com/pivot-img/photo/mus_024.jpg",
  "age": "20",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 167016.0
 },
 {
  "name": "Shaheera Mohd Aniq",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_049.jpg",
  "age": "19",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 248865.6
 },
 {
  "name": "Nursyamimi Atiqah",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_103.jpg",
  "age": "27",
  "country": "MY",
  "interest": "Cooking",
  "netWorth": 288734.4
 },
 {
  "name": "Catherine Wheeler",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_038.jpg",
  "age": "23",
  "country": "US",
  "interest": "Hiking",
  "netWorth": 53697.6
 },
 {
  "name": "Azizah Mahzan",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_110.jpg",
  "age": "28",
  "country": "MY",
  "interest": "Hiking",
  "netWorth": 210508.8
 },
 {
  "name": "Mohd Azmi",
  "photo": "https://static.kasatria.com/pivot-img/photo/m_149.jpg",
  "age": "30",
  "country": "MY",
  "interest": "Traveling",
  "netWorth": 212006.4
 },
 {
  "name": "Anastasia Morrison",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_035.jpg",
  "age": "33",
  "country": "US",
  "interest": "Hiking",
  "netWorth": 71625.6
 },
 {
  "name": "Razak Muhaidin",
  "photo": "https://static.kasatria.com/pivot-img/photo/ph_151.jpg",
  "age": "40",
  "country": "MY",
  "interest": "Gardening",
  "netWorth": 259934.4
 },
 {
  "name": "Helena Tillsley",
  "photo": "https://static.kasatria.com/pivot-img/photo/o_014.jpg",
  "age": "45",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 192369.6
 },
 {
  "name": "Ryder Fletcher",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_057.jpg",
  "age": "50",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 257323.2
 },
 {
  "name": "Sara Fessenden",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_058.jpg",
  "age": "38",
  "country": "US",
  "interest": "Writing",
  "netWorth": 145972.8
 },
 {
  "name": "Jeffrey Ewing",
  "photo": "https://static.kasatria.com/pivot-img/photo/J_011.jpg",
  "age": "49",
  "country": "CN",
  "interest": "Gardening",
  "netWorth": 254068.8
 },
 {
  "name": "Dawson Hoffman",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0162.jpg",
  "age": "38",
  "country": "US",
  "interest": "Cooking",
  "netWorth": 181804.8
 },
 {
  "name": "Jonne Macdonald",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_052.jpg",
  "age": "36",
  "country": "US",
  "interest": "Hiking",
  "netWorth": 212760.0
 },
 {
  "name": "Pierre Henry",
  "photo": "https://static.kasatria.com/pivot-img/photo/CA0267.jpg",
  "age": "52",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 127704.0
 },
 {
  "name": "Collen McClintock",
  "photo": "https://static.kasatria.com/pivot-img/photo/G_039.jpg",
  "age": "51",
  "country": "US",
  "interest": "Gardening",
  "netWorth": 261883.2
 }
];

async function getData() {
	// TODO (later step): replace this with a live fetch to the Google Sheet.
	// For now, just return the local copy so we can build/test everything else.
	return PEOPLE_DATA;
}

export { getData };
