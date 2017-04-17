/* @flow */

import React, { Component } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import Button from '../../components/Button'
import ScoreBoard from '../../components/ScoreBoard'
import ProgressBoard from '../../components/ProgressBoard'
import styles from './styles'
import I18n from '../../i18n'


type myProps = {
  navigation: {
    navigate: any,
    state: {
      params: {
        teams: [Array<string>,Array<string>],
        score: Array<number>,
      }
    }
  }
}

export class Score extends Component {
  static navigationOptions = {
    header: {visible: false},
  };
  props: myProps;
  state: {
    teams: [Array<string>, Array<string>],
    score: Array<number>
  }
  constructor(props: myProps) {
    super(props)
    const {teams, score} = props.navigation.state.params;
    this.state = {
      teams: teams,
      score: score
    }
  }

  totalRounds = 15

  componentWillMount(){
    const { teams, score } = this.state
    const { navigate } = this.props.navigation
    let standing = [0,0];
    for(let i=0; i<score.length; i++){
      standing[score[i]] += (i+1)
    }
    if(standing[score[score.length-1]]>((1+this.totalRounds)*this.totalRounds)/4){
      navigate('FinalScore', {teams: teams, score: score})
    }
  }

  render() {
    const { teams, score } = this.state
    const { navigate } = this.props.navigation
    let standing = [0,0];
    for(let i=0; i<score.length; i++){
      standing[score[i]] += (i+1)
    }

    return (
      <View style={styles.main}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {I18n.t('score')} {I18n.t('after')} {I18n.t('game')} {score.length}
          </Text>
          <ScoreBoard
            standing={standing}
          />
          <ProgressBoard
            score={score}
          />
        </View>
        <View>
          <Button
            text={I18n.t('nextGame')}
            onPress={() => navigate('Game', {teams: teams, score: score})}
          />
        </View>
      </View>
    );
  }
};
