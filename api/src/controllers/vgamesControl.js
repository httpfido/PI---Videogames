// - - - - - - - - - - - - - - - -    CONTROLLERS PARA VIDEOGAMES    - - - - - - - - - - - - - - - - - - - -

const { Op } = require("sequelize");
const axios = require("axios");
const { Videogame, Genre, VideogameGenre } = require("../db");
const { API_KEY } = process.env;


// me voy a auxiliar con una funcion que me va a devolver de manera prolija los generos cada juego de BDD

const genreMap = async (games)=>{
   const result = await games.map((game) => {
    return {
      id: game.id,
      name: game.name,
      released: game.released,
      rating: game.rating,
      genres: game.genres.map(genre=>genre.name),
      platforms: game.platforms,
      created: game.created
    };
  });
  return result;
}
 

// - - - - - - - - - - - - - - - - - - - - TRAER TODOS LOS JUEGOS - - - - - - - - - - - - - - - - - - - -

// traigo todos los videogames desde la API
const getAllAPI = async () => {
  const getAll = await axios.get(
    `https://api.rawg.io/api/games?key=${API_KEY}`
  );
  const gamesREADY = getAll.data.results.map((game) => {
    return {
      id: game.id,
      name: game.name,
      background_image: game.background_image,
      released: game.released,
      rating: game.rating,
      genres: game.genres.map((g) => g.name),
      platforms: game.platforms.map((g) => g.platform.name),
      created: false,
    };
  });
  return gamesREADY;
};

// traigo todos los videogames desde la BDD
const getAllBDD = async () => {
  const allGames = await Videogame.findAll({
    include: [
      {
        model: Genre,
        attributes: ["name"],
        through: {
          attributes: [],
        },
      },
    ],
  });

    const mapped = await genreMap(allGames);
  return mapped;
};

// concateno los videogames de la BDD con los de la API
const getAllGamesBDDAPI = async () => {
  const fromAPI = await getAllAPI();
  const fromBDD = await getAllBDD();
  const BDDAPI = await fromBDD.concat(fromAPI).slice(0, 15);
  return BDDAPI;
};

// - - - - - - - - - - - - - - - - - - - - BUSCAR POR NOMBRE - - - - - - - - - - - - - - - - - - - -

// busca en la API
const findGamesAPI = async (name) => {
  const api = await axios.get(
    `https://api.rawg.io/api/games?search=${name}&key=${API_KEY}`
  );
  const gamesREADY = api.data.results.map((game) => {
    return {
      id: game.id,
      name: game.name,
      background_image: game.background_image,
      released: game.released,
      rating: game.rating,
      genres: game.genres.map((g) => g.name),
      platforms: game.platforms.map((g) => g.platform.name),
      created: false,
    };
  });
  return gamesREADY;
};

// busca en la BDD
const findGamesBDD = async (name) => {
  let result = await Videogame.findAll({
    where: {
      name: { [Op.iLike]: `%${name}%` },
    },
  });
  return result;
};

// concatena BDD y API
const findGames = async (name) => {
  const bdd = await findGamesBDD(name);
  const api = await findGamesAPI(name);

  if (!api && !bdd) throw Error("No se encontro el juego");

  return [...bdd, ...api].slice(0, 15);
};

// - - - - - - - - - - - - - - - - - - - - BUSCAR POR ID - - - - - - - - - - - - - - - - - - - -

// busca el juego por NAME solamente en la API
const findByIdAPI = async (id) => {
  try {
    const game = (
      await axios.get(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`)
    ).data;
    const result = {
      id: game.id,
      name: game.name,
      description: game.description,
      background_image: game.background_image,
      released: game.released,
      rating: game.rating,
      genres: game.genres.map((g) => g.name),
      created: false,
    };

    return result;
  } catch (error) {
    throw Error("No se encontro el juego");
  }
};

// busca el juego por NAME solamente en la BDD
const findByIdBDD = async (id) => {
  const result = await Videogame.findAll({ 
    where: { id },
    include: [
      {
        model: Genre,
        attributes: ["name"],
        through: {
          attributes: [],
        },
      },
    ],
  });

  const mapped = await genreMap(result);
  return mapped
}

// findbyID funciona de spliter. Señala si buscar en BDD o API
const findById = async (id, source) => {
  const result =
    source === "api" ? await findByIdAPI(id) : await findByIdBDD(id);
  return result;
};

// - - - - - - - - - - - - - - - - - - - - CREAR NUEVO JUEGO - - - - - - - - - - - - - - - - - - - -

// createGame crea el juego. Se asegura de que no exista ningun juego con el mismo nombre en API
const createGame = async (
  name,
  description,
  released,
  genres,
  rating,
  platforms
) => {
  const api = await getAllAPI();
  const apiFilter = api.filter((game) => game.name === name);
  if (apiFilter.length !== 0) throw Error("Ya existe un juego con ese nombre");
  const createGame = await Videogame.create({
    name,
    description,
    released,
    rating,
    platforms,
  });

  const genreBDD = await Genre.findAll({
    where: {
      name: genres,
    },
  });
  createGame.addGenre(genreBDD);
  return createGame;
};

module.exports = {
  getAllGamesBDDAPI,
  findGames,
  findById,
  createGame,
};
