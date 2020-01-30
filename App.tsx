import React from 'react';
import { Image, Dimensions, StyleSheet, TouchableWithoutFeedback, View, Keyboard, FlatList, Alert } from 'react-native';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
import _ from 'lodash';
import {Provider, connect} from 'react-redux';
import {Player, Round, store, persistor} from './store'
import { ListItem, List, Text, Input, ApplicationProvider, IconRegistry, Layout, Button, Icon } from '@ui-kitten/components';
import { mapping, dark as darkTheme } from '@eva-design/eva';
import { SafeAreaView } from 'react-navigation';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import InputScrollView from 'react-native-input-scroll-view';
import { PersistGate } from 'redux-persist/integration/react';

// TODO replace with background-basic-color-1 from theme
const dartThemeBackground = '#222B45'
const fullWidth = Dimensions.get('window').width

class MainScreen extends React.Component<{navigation, rounds: Array<Round>},{}> {
  constructor(props) {
    super(props);
  }
  render() {
    const {navigate} = this.props.navigation;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dartThemeBackground}}>
        <Layout style={{flex: 1, justifyContent: 'space-around', alignItems: 'center'}}>
          <Image source={require('./assets/xmenu.png')} style={{width: 250, height: 200}}/>
          <Button onPress={() => {navigate('NewGame')}}> New Game </Button>
          <Button onPress={() => {navigate('Leaderboard')}} disabled={this.props.rounds.length==0}> Continue </Button>
        </Layout>
      </SafeAreaView>
    );
  }
}
const ConnectedMainScreen = connect(state=>state)(MainScreen)

class NewGameScreen extends React.Component<{navigation, dispatch, players: Array<Player>, games: Array<string>},{playerText: string, gameText: string}> {
  constructor(props) {
    super(props);
    this.state = {
      playerText: this.props.players.map(p => p.name).join("\n"),
      gameText: this.props.games.join("\n"),
    };
  }
  getPlayersFromText: (text: string) => Array<Player> = (text) => {
    return text.split('\n').filter(x => x.trim().length>0).map((word) => {return {name: word, active: true}})
  }
  getDuplicatePlayers: (players: Array<Player>) => string[] = (players) => {
    return _.values(_.keys(_.pickBy(_.groupBy(players.map(x => x.name)), x => x.length > 1)))
  }
  render() {
    const {navigate} = this.props.navigation;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dartThemeBackground}}>
      <Layout style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <TouchableWithoutFeedback onPress={() => {Keyboard.dismiss()}}>
          <InputScrollView style={{flex:1, width: fullWidth, padding: 15}}>
            <Text category="h1" style={{flex: 1, textAlign: 'center', margin: 15}}>X</Text>
            <Text category="h3">Players</Text>
            <Input multiline={true} scrollEnabled={false} onChangeText={(text) => this.setState({playerText: text})} value={this.state.playerText}></Input>
            <Text category="h3">Games</Text>
            <Input multiline={true} scrollEnabled={false} onChangeText={(text) => this.setState({gameText: text})} value={this.state.gameText}></Input>
            <Button
                onPress={() => {
                  let players = this.getPlayersFromText(this.state.playerText);
                  let duplicates = this.getDuplicatePlayers(players);
                  if(players.length < 2){
                    Alert.alert("It takes two to tango!")
                  }
                  if(duplicates.length > 0){
                    Alert.alert("Duplicate players: "+duplicates.join(", "));
                  } else {
                    this.props.dispatch({
                      type: 'START_MATCH',
                      payload: {
                        players: players,
                        games: _.shuffle(this.state.gameText.split('\n').filter(x => x.trim().length > 0))
                      }})
                      navigate('Leaderboard')
                    }}
                  }
              >Start</Button>
          </InputScrollView>
        </TouchableWithoutFeedback>
      </Layout></SafeAreaView>
    );
  }
}
const ConnectedNewGameScreen = connect(state=>state)(NewGameScreen)

class LeaderboardScreen extends React.Component<{navigation, dispatch, players: Array<Player>, rounds: Array<Round>, games: Array<string>},{}> {
  getPlayerScores: () => { [key: string]: number; } = () => {
    let playerScores = {};
    const {rounds, players} = this.props;
    players.map(x => playerScores[x.name] = 0);
    for(let i=0; i<rounds.length; i++){
      let round = rounds[i]
     if(round.winner in [0,1]){
        round.teams[round.winner].map(player => playerScores[player.name]+=(i+1));
     }
    }
    return playerScores;
  }
  getRandomTeams: (players: Array<Player>) => Array<Array<Player>> = (players) => {
    let activePlayers = players.filter(p => p.active)
    let shuffledPlayers = _.shuffle(activePlayers);
    let splitPoint = Math.floor(activePlayers.length/2)
    if(activePlayers.length % 2){
      splitPoint += _.random();
    }
    let teams = [shuffledPlayers.slice(0,splitPoint), shuffledPlayers.slice(splitPoint)]
    return teams;
  }
  render() {
    const {navigate} = this.props.navigation;
    const gameIndex = this.props.rounds.length-1;
    const gameRunning = gameIndex >= 0 && this.props.rounds[gameIndex].winner == -1;
    let playerScores = this.getPlayerScores();
    let isOver = this.props.rounds.length >= this.props.games.length;
    let sortedPlayers = this.props.players.sort((x,y) => playerScores[y.name]-playerScores[x.name])
    let lastScore = -1;
    let tieIndex = -1;
    let ranks = sortedPlayers.map((player,index) => {
      let thisScore = playerScores[player.name];
      if(thisScore == lastScore){
        return (tieIndex+1).toString();
      } else {
        lastScore = thisScore;
        tieIndex = index;
        return (index+1).toString();
      }
    });
    if(isOver){
      ranks = ranks.map(x => x=='1' ? '🏆' : x);
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dartThemeBackground}}>
      <Layout style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <View style={{width: fullWidth, padding: 15}}> 
          <List
            data={sortedPlayers}
            renderItem={({item, index}) => {
              return(
                <ListItem onPress={(index) => {
                  this.props.dispatch({type: 'TOGGLE_PLAYER', payload: sortedPlayers[index].name})
                }}>
                  <LeaderboardEntry rank={ranks[index]} name={item.name} points={playerScores[item.name]} active={item.active}/>
                </ListItem>
              )}
            }
            keyExtractor={item => item.name}
          />
          <Button onPress={() => {
                if(isOver){
                  navigate('Main');
                } else {
                  if(!gameRunning){
                    let teams = this.getRandomTeams(this.props.players)
                    this.props.dispatch({type: 'START_NEXT_GAME', payload: teams})
                  }
                  navigate('Game')
                }
              }
            }>
            {isOver ? "Back to Main" : (gameRunning ? "Back to Game" : "Next Game")}
          </Button>
        </View>
      </Layout>
      </SafeAreaView>
    );
  }
}
const ConnectedLeaderboardScreen = connect(state => state)(LeaderboardScreen)

class GameScreen extends React.Component<{navigation, dispatch, players: Array<Player>, rounds: Array<Round>, games: Array<string>},{}> {
  reportResult: (index: number) => void = (index) => {
    this.props.dispatch({type: 'GAME_RESULT', payload: index})
  }
  gameIndex: number = this.props.rounds.length - 1;
  game: string = this.props.games[this.gameIndex];
  render() {
    const teams = this.props.rounds[this.gameIndex].teams;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dartThemeBackground}}>
      <Layout style={{flex: 1}}>
        <View style={{flex: 1, width: fullWidth, justifyContent: "space-around", alignItems: "center", padding: 15}}>
          <Text category="h1">{this.game}</Text>
          <View style={{flex: 1, flexDirection: "row", justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 30}}>
            <FlatList
              data={teams[0]}
              renderItem={({item}) => <Text category="h4">{item.name}</Text>}
              keyExtractor={item => item.name}
            />
            <FlatList
              data={teams[1]}
              renderItem={({item}) => <Text category="h4" style={{textAlign: "right"}}>{item.name}</Text>}
              keyExtractor={item => item.name}
            />
          </View>
          <View style={{flex: 1, flexDirection: "row", width: fullWidth, justifyContent: "space-around", alignItems: 'baseline'}}>
            <Button
                onPress={() => {
                  this.reportResult(0)
                  this.props.navigation.navigate('Leaderboard')
                }}
            >Win Team1</Button>
            <Button
                onPress={() => {
                  this.reportResult(1)
                  this.props.navigation.navigate('Leaderboard')
                }}
            >Win Team2</Button>
          </View>
        </View>
      </Layout>
      </SafeAreaView>
    );
  }
}
const ConnectedGameScreen = connect(state => state)(GameScreen)

class LeaderboardEntry extends React.Component<{rank: string, name: string, points: number, active: boolean}, {}> {
  render() {
    const appearance = this.props.active ? "default" : "hint";
    return (
      <View style={styles.lbEntryContainer}>
        <Text category="h3" appearance={appearance}>{this.props.rank}</Text>
        <View style={{flex: 1, marginLeft: 10}}><Text category="h3" appearance={appearance}>{this.props.name}</Text></View>
        <Text style={{marginRight: 10}} category="h3" appearance={appearance}>{this.props.points.toString()}</Text>
        <Icon name={this.props.active ? 'checkmark-circle-2' : 'checkmark-circle-2-outline'} width={25} height={25} fill="#fff"/>
      </View>
    );
  }
}

const MainNavigator = createStackNavigator({
  Game: {screen: ConnectedGameScreen},
  NewGame: {screen: ConnectedNewGameScreen},
  Leaderboard: {screen: ConnectedLeaderboardScreen},
  Main: {screen: ConnectedMainScreen},
}, {initialRouteName: 'Main', headerMode: 'none'});

const Navigation = createAppContainer(MainNavigator);

const App = () => (
      <React.Fragment>
        <IconRegistry icons={EvaIconsPack}/>
        <ApplicationProvider mapping={mapping} theme={darkTheme}>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <Navigation />
            </PersistGate>
          </Provider>
        </ApplicationProvider>
      </React.Fragment>
  );

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 32,
  },
  label: {
    fontSize: 20,
    marginVertical: 4,
  },
  inputArea: {
    backgroundColor: "#ddd",
    minWidth: 200,
  },
  lbEntryContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lbEntryRank: {
    fontSize: 20,
    marginHorizontal: 5,
  },
  lbEntryName: {
    fontSize: 20,
  },
  lbEntryPoints: {
    fontSize: 20,
    marginHorizontal: 5,
  },
});