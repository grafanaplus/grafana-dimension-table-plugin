import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';

import {dimensionTableEditor} from './editor';
import {transformation} from './transformers';
import {Renderer} from './renderer';

import DataFrame from "./external/dataframe";

//Temporary
import $ from 'jquery';

const panelDefaults = {
  
  transform: 'json',
  columns: [],
  dimensions: [],
  calculations: [],
  templates:[],
  sort: {col: 0, desc: false}
};

export class DimensionTableCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector) {
    super($scope, $injector);
    _.defaults(this.panel, panelDefaults);
  
    this._dataRaw = null;
    this._table = null;

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

    //temporary
    this._cache = {};
  }

  get dataRaw(){
    return this._dataRaw;
  }

  set dataRaw(raw){
    this._dataRaw = raw;
  }

  get table(){
    return this._table;
  }

  set table(t){
    this._table = t;
  }

  get cache(){
    return this._cache;
  }

  onInitEditMode() {
    this.addEditorTab('Options', dimensionTableEditor, 2);
  }

  onDataReceived(dataList) {
    this._dataRaw = dataList;

    //Start here... Get and Save Data-Entry API locally.
    var self = this;
    if(!this.cache.token){
      //Perform login
      $.ajax({
        method: 'POST',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/sign-in',
        data: {username: "admin", password: "admin"},
        async: false,
        success: function(result){
          self.cache.token = result.token;
        }
      });
    }

    // Produto
    if(!this.cache.produto_list){
      $.ajax({
        method: 'GET',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/entity/Produto',
        headers: {'X-Access-Token': self.cache.token},
        async: false,
        success: function(result){
          self.cache.produto_list = result;
        }
      });
    }

    //Projeto
    if(!this.cache.projeto_list){
      $.ajax({
        method: 'GET',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/entity/Projeto',
        headers: {'X-Access-Token': self.cache.token},
        async: false,
        success: function(result){
          self.cache.projeto_list = result;
        }
      });
    }

    //Release
    if(!this.cache.release_list){
      $.ajax({
        method: 'GET',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/entity/Release',
        headers: {'X-Access-Token': self.cache.token},
        async: false,
        success: function(result){
          self.cache.release_list = result;
        }
      });
    }

    //Sigla
    if(!this.cache.sigla_list){
      $.ajax({
        method: 'GET',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/entity/Sigla',
        headers: {'X-Access-Token': self.cache.token},
        async: false,
        success: function(result){
          self.cache.sigla_list = result;
        }
      });
    }

    //Canal
    if(!this.cache.canal_list){
      $.ajax({
        method: 'GET',
        url: 'https://dataentry-rm-dev.appls.cmpn.paas.gsnetcloud.corp/api/entity/Canal',
        headers: {'X-Access-Token': self.cache.token},
        async: false,
        success: function(result){
          self.cache.canal_list = result;
        }
      });
    }
 
    //campos que sempre devem existir no bean
    var beanDefaults = {
      release_code: '',
      release_resumo: '',
      release_data_inicial: '',
      release_data_final: '',
      sigla_code: '',
      sigla_nome: '',
      projeto_code: '',
      projeto_nome: '',
      projeto_resumo: '',
      projeto_data_inicial: '',
      projeto_data_final: '',
      produto_code: '',
      produto_nome: '',
      produto_descricao: '',
      canal_code: '',
      canal_nome: ''
    };

    //Para datapoint, fazer
    var datapoints = this._dataRaw[0].datapoints;
    for(var i = 0; i < datapoints.length; i++){
      //vamos Processar Release
      //

      var bean = datapoints[i].bean;

      //buscar sigla na lista de releases utilizando o método find
      var release = this.cache.release_list.find(function(elem, index){
        if(elem.siglas[0]){
          return elem.siglas[0].name === bean.plugin_system;
        }

        return false;
      });

      //aplicar propriedades padrão
      _.defaults(bean, beanDefaults);

      var projeto;

      //se found estiver preenchido, então encontramos
      if(release){
        bean.release_code = release.numero;
        bean.release_data_inicial = release.data_inicial;
        bean.release_data_final = release.data_final;

        //buscar id do projeto na lista de projeto
        projeto = this.cache.projeto_list.find(function(elem, index){
          return elem.id === release.projeto.id;
        });
      }

      //se projeto preenchido, ele foi encontrado 
      if(projeto) {
        bean.projeto_code = projeto.id;
        bean.projeto_data_inicial = projeto.data_inicial;
        bean.projeto_data_final = projeto.data_final;
        bean.projeto_nome = projeto.nome;
        bean.projeto_resumo = projeto.resumo;

        //buscar id do produto na lista de produto
        var produto = this.cache.produto_list.find(function(elem, index){
          return elem.id === projeto.produto.id; //get na api :D
        });

        if(produto) {
          bean.produto_code = produto.id;
          bean.produto_nome = produto.nome;
          bean.produto_descricao = produto.descricao;
        }

        var canal = this.cache.canal_list.find(function(elem, index) {
          if(produto.canais[0]){
            return elem.id === produto.canais[0].id;
          }

          return false;
        });

        if(canal) {
          bean.canal_code = canal.code;
          bean.canal_nome = canal.nome;
        }

      }
    }

    console.log(this._dataRaw);

    this.render();
  }

  onDataError(err){
    this._dataRaw = [];
    this.render();
  }

  toggleSort(column, columnIndex){
  
  }

  render(){
    this._table = transformation(this._dataRaw, this.panel);
    //this._table.sort
    super.render(this._table);
  }

  link(scope, elem, attrs, ctrl){

    var data;
    var ctrl = ctrl;
    var panel = ctrl.panel;
    var pageCount = 0;
   
    function renderPanel() {

      elem.css({'font-size': panel.fontSize});
      elem.parents('.panel').addClass('table-panel-wrapper');
  
      var renderer = new Renderer(panel, data, ctrl.$sanitize, ctrl.dashboard);
      var html = renderer.render(0);

      var tbody = elem.find('tbody');
      tbody.empty();
      tbody.html(html);

      var rootele = elem.find('.table-panel-scroll');
      rootele.css({'max-height': ctrl.height});

    }

    ctrl.events.on('render', function(renderData){
      data = renderData || data;
            
      if(data){
        renderPanel();
      }

      ctrl.renderingCompleted();
    });
  }
}

DimensionTableCtrl.templateUrl = 'module.html';

